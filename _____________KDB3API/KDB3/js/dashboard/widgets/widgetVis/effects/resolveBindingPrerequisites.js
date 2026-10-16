define([
  "./gates/blockedResult.js",
  "./gates/dienststelleGate.js",
  "./gates/topNGate.js"
], function (_blockedResult, _dienststelleGate, _topNGate) {
  "use strict";

  function validateSettings(_settings, _input) {
    var settings = _settings || {};
    if (settings.dimension === undefined || settings.visType === undefined || settings.topNChoice === undefined) {
      return _blockedResult("error", "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE", "settings_incomplete", _input);
    }
    if (settings.visType == null || settings.visType === "") {
      return _blockedResult("error", "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE", "settings_incomplete", _input);
    }
    return null;
  }

  function resolveBindingPrerequisites(_context, _input) {
    var input = Object.assign({}, _input || {});
    if (input.forceEmpty === true || input.reason === "cleanup") {
      return Promise.resolve({
        ok: true,
        input: Object.assign({}, input, { helperTableResult: null })
      });
    }
    var settingsBlock = validateSettings(input.settings, input);
    if (settingsBlock) {
      return Promise.resolve(settingsBlock);
    }
    var settings = input.settings;
    return _dienststelleGate.resolveDienststellePrerequisite(_context._KDB, input).then(function (_hierarchySnapshot) {
      return _topNGate.resolveTopNPrerequisite(_context, input, settings, _hierarchySnapshot).then(function (_topNOutcome) {
        if (_topNOutcome && _topNOutcome.blocked === true) {
          return _topNOutcome.result;
        }
        return {
          ok: true,
          input: Object.assign({}, input, {
            settings: settings,
            hierarchySnapshot: _hierarchySnapshot,
            helperTableResult: _topNOutcome
          })
        };
      });
    }).catch(function (_err) {
      if (_err && _err.destroyed) {
        return _blockedResult("error", "WIDGET_VIS_DESTROY_FAILED", "destroyed", input);
      }
      if (_err && _err.timedOut) {
        var blockedReason = _err.kind === "topN" ? "awaiting_topN" : "awaiting_dienststelle";
        return _blockedResult("timeout", "WIDGET_VIS_BINDING_PREREQUISITE_TIMEOUT", blockedReason, input);
      }
      if (_err && _err.cancelled) {
        return {
          ok: false,
          widgetId: input.widgetId,
          opSeq: input.opSeq,
          stale: true,
          status: "aborted"
        };
      }
      if (_err && _err.prerequisiteFailed) {
        return _blockedResult("error", _err.errorCode || "WIDGET_VIS_BINDING_PREREQUISITE_FAILED", "prerequisite_failed", input, {
          errorMessage: _err.errorMessage || null,
          kind: _err.kind || null
        });
      }
      return _blockedResult("error", "WIDGET_VIS_BINDING_PREREQUISITE_FAILED", "prerequisite_failed", input);
    });
  }

  return {
    resolveBindingPrerequisites: resolveBindingPrerequisites,
    isConfirmedHierarchy: _dienststelleGate.isConfirmedHierarchy,
    resolveDienststelleGateWaiters: _dienststelleGate.resolveDienststelleGateWaiters,
    resolveTopNGateWaiter: _topNGate.resolveTopNGateWaiter,
    cancelTopNGateWaiter: _topNGate.cancelTopNGateWaiter,
    rejectAllDienststelleGateWaiters: _dienststelleGate.rejectAllDienststelleGateWaiters,
    rejectAllTopNGateWaiters: _topNGate.rejectAllTopNGateWaiters,
    mapTopNPayloadToHelper: _topNGate.mapTopNPayloadToHelper,
    isDefaultTopNChoice: _topNGate.isDefaultTopNChoice
  };
});

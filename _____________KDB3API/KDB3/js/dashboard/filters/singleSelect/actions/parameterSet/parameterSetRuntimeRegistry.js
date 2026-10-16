define(["../../config.js"], function (_config) {
  "use strict";

  var RUN_FINISH_OUTCOMES = Object.freeze({
    success: true,
    failure: true,
    cancelled: true,
    abortedByOwner: true
  });

  function ensureRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.singleSelect = _KDB.runtime.singleSelect || {};
    var runtime = _KDB.runtime.singleSelect;
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.pendingPromises.parameterSetRuns = runtime.pendingPromises.parameterSetRuns || {};
    return runtime;
  }

  function resetAppliedPageContext(_KDB, _runId) {
    var runtime = ensureRuntime(_KDB);
    runtime.pendingPromises.parameterSetRuns[String(_runId)] = {
      runId: _runId,
      inventoryGeneration: null,
      appliedByInstanceId: {}
    };
  }

  function ensureRunRegistry(_KDB, _runId) {
    var runtime = ensureRuntime(_KDB);
    var key = String(_runId);
    if (!runtime.pendingPromises.parameterSetRuns[key]) {
      resetAppliedPageContext(_KDB, _runId);
    }
    return runtime.pendingPromises.parameterSetRuns[key];
  }

  function registerAppliedPageContext(_KDB, _runId, _filterInstanceId, _entry) {
    var registry = ensureRunRegistry(_KDB, _runId);
    registry.appliedByInstanceId[_filterInstanceId] = Object.assign({}, _entry || {});
  }

  function readAppliedPageContext(_KDB, _runId) {
    var runtime = ensureRuntime(_KDB);
    var registry = runtime.pendingPromises.parameterSetRuns[String(_runId)];
    return registry ? registry.appliedByInstanceId : null;
  }

  function isRunFinishOutcome(_outcome) {
    return typeof _outcome === "string" && RUN_FINISH_OUTCOMES[_outcome] === true;
  }

  function settleParameterSetRun(_KDB, _runId, _options) {
    try {
      var options = _options || {};
      var runtime = ensureRuntime(_KDB);
      var key = String(_runId);
      var registry = runtime.pendingPromises.parameterSetRuns || {};
      if (!Object.prototype.hasOwnProperty.call(registry, key)) {
        var diagnostics = [];
        if (options.reportAlreadyReleased !== false) {
          diagnostics.push({
            code: _config.parameterSetCodes.RUN_FINISH_ALREADY_RELEASED,
            runId: _runId,
            message: "parameterSet run registry already released for runId " + key
          });
        }
        return buildRunReleaseAck(true, _runId, false, true, diagnostics);
      }
      delete registry[key];
      if (Object.prototype.hasOwnProperty.call(registry, key)) {
        return buildRunReleaseAck(false, _runId, false, false, [{
          code: _config.parameterSetCodes.RESYNC_FAILED,
          runId: _runId,
          message: "parameterSet run registry could not be removed for runId " + key
        }]);
      }
      return buildRunReleaseAck(true, _runId, true, false, []);
    } catch (error) {
      return buildRunReleaseAck(false, _runId, false, false, [{
        code: _config.parameterSetCodes.RESYNC_FAILED,
        runId: _runId,
        message: "parameterSet run registry cleanup failed for runId " + String(_runId) +
          ": " + String(error && error.message ? error.message : error)
      }]);
    }
  }

  function buildRunReleaseAck(_ok, _runId, _released, _alreadyReleased, _diagnostics) {
    return {
      ok: _ok === true,
      runId: _runId,
      released: _released === true,
      alreadyReleased: _alreadyReleased === true,
      diagnostics: Array.isArray(_diagnostics) ? _diagnostics.slice() : []
    };
  }

  return {
    ensureRuntime: ensureRuntime,
    resetAppliedPageContext: resetAppliedPageContext,
    ensureRunRegistry: ensureRunRegistry,
    registerAppliedPageContext: registerAppliedPageContext,
    readAppliedPageContext: readAppliedPageContext,
    isRunFinishOutcome: isRunFinishOutcome,
    settleParameterSetRun: settleParameterSetRun,
    buildRunReleaseAck: buildRunReleaseAck
  };
});

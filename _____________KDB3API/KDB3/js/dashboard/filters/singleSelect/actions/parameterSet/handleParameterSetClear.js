define([
  "../../config/parameterSetCodes.js",
  "./parameterSetRuntime.js",
  "./filterRestoreSupport.js",
  "../reconcileFilterInstances.js",
  "./clearParameterSetInstances.js"
], function (_codes, _runtime, _support, _reconcileFilterInstances, _clearParameterSetInstances) {
  "use strict";

  async function handleParameterSetClear(_KDB, _payload, _runtimeState) {
    try {
      var payload = _payload || {};
      var diagnostics = [];
      var result = { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] };
      var filtersFacet = _support.readFiltersFacet(_KDB, _runtimeState);
      var guardResult = _runtime.guardRun(_KDB, payload);
      if (guardResult) {
        result = guardResult;
      } else {
        var writebackGate = _runtime.ensureWritebackPinnedGeneration(_KDB, payload);
        if (!writebackGate.ok) {
          result = {
            ok: false,
            degraded: false,
            applied: [],
            skipped: [],
            diagnostics: [{ code: writebackGate.code || _codes.INVENTORY_STALE, message: writebackGate.message }]
          };
        } else if (!filtersFacet || typeof filtersFacet.writeFilter !== "function") {
          diagnostics.push({ code: _codes.RESTORE_FAILED, message: "replaceFilterContext unavailable; singleSelect clear skipped" });
          result = settle(payload.status, diagnostics, null);
        } else {
          var clearOutcome = await _clearParameterSetInstances(
            _KDB, _runtimeState, payload, filtersFacet, diagnostics
          );
          if (clearOutcome && clearOutcome.cancelledResult) {
            result = clearOutcome.cancelledResult;
          } else if (clearOutcome && clearOutcome.ok === false) {
            diagnostics.push({
              code: _codes.RESTORE_FAILED,
              message: "singleSelect clear failed: " + String(
                clearOutcome.error && clearOutcome.error.message ? clearOutcome.error.message : clearOutcome.error
              )
            });
            result = settle(payload.status, diagnostics, null);
          } else {
            var finalGuard = _runtime.validateMutationGuard(_KDB, payload);
            if (!finalGuard.ok) {
              result = finalGuard;
            } else {
              clearInteractionState(_KDB);
              if (writebackGate.shouldBypassReconcile === true) {
                result = settle(payload.status, diagnostics, null);
              } else {
                var reconcileResult = await _reconcileFilterInstances(
                  _KDB,
                  _runtimeState,
                  { reason: "parameterRestore", runId: payload.runId }
                );
                result = settle(payload.status, diagnostics, reconcileResult);
              }
            }
          }
        }
      }
      if (result && result.ok === false) {
        result = _runtime.mergeTerminalCleanup(_KDB, payload, result, { reportAlreadyReleased: false });
      }
      return Promise.resolve(result);
    } catch (error) {
      return Promise.resolve(_runtime.mergeTerminalCleanup(_KDB, _payload || {}, {
        ok: false,
        degraded: false,
        applied: [],
        skipped: [],
        diagnostics: [{
          code: _codes.RESTORE_FAILED,
          message: "singleSelect clear failed: " + String(error && error.message ? error.message : error)
        }]
      }, { reportAlreadyReleased: false }));
    }
  }

  function clearInteractionState(_KDB) {
    var root = _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!root) {
      return;
    }
    root.lastInteraction = null;
    root.lastConfirmedAt = null;
  }

  function settle(_status, _diagnostics, _reconcileResult) {
    var diagnostics = (_diagnostics || []).concat(
      _reconcileResult && Array.isArray(_reconcileResult.diagnostics) ? _reconcileResult.diagnostics : []
    );
    var reconcileFailed = _reconcileResult && _reconcileResult.ok === false;
    var degraded = !!(_reconcileResult && _reconcileResult.degraded === true);
    if (_status === "newDashboard") {
      return {
        ok: !reconcileFailed,
        degraded: degraded || diagnostics.length > 0,
        applied: [],
        skipped: [],
        diagnostics: diagnostics
      };
    }
    return {
      ok: !reconcileFailed && diagnostics.length === 0,
      degraded: degraded,
      applied: [],
      skipped: [],
      diagnostics: diagnostics
    };
  }

  return handleParameterSetClear;
});

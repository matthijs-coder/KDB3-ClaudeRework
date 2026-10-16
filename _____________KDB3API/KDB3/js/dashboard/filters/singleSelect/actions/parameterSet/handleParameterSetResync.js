define([
  "../../config.js",
  "./parameterSetRuntime.js",
  "../../inventory/reconcile.js",
  "./parameterSetResyncApply.js",
  "../../view.js"
], function (
  _config,
  _runtime,
  _reconcileInventory,
  _resyncApply,
  _view
) {
  "use strict";

  async function handleParameterSetResync(_KDB, _payload, _runtimeState) {
    try {
      var payload = _payload || {};
      var diagnostics = [];
      var progress = { applied: [], skipped: [] };
      var result;
      var guardResult = _runtime.guardRun(_KDB, payload);
      if (guardResult) {
        result = _resyncApply.normalizeResult(guardResult);
      } else {
        var writebackGate = _runtime.ensureWritebackPinnedGeneration(_KDB, payload);
        if (!writebackGate.ok) {
          result = _resyncApply.normalizeResult({
            ok: false,
            degraded: false,
            applied: [],
            skipped: [],
            diagnostics: [{ code: writebackGate.code || _config.parameterSetCodes.INVENTORY_STALE, message: writebackGate.message }]
          });
        } else {
          var applyOutcome = await _resyncApply.resyncApplied(
            _KDB, _runtimeState, payload, diagnostics, progress
          );
          if (applyOutcome && applyOutcome.cancelledResult) {
            result = _resyncApply.normalizeResult(applyOutcome.cancelledResult);
          } else if (applyOutcome && applyOutcome.ok === false) {
            diagnostics.push({
              code: _config.parameterSetCodes.RESYNC_FAILED,
              message: "singleSelect resync apply failed: " + String(
                applyOutcome.error && applyOutcome.error.message ? applyOutcome.error.message : applyOutcome.error
              )
            });
            result = _resyncApply.settleResult(diagnostics, null, progress);
          } else {
            var reconcileResult = await _reconcileInventory.reconcileFilterInstances(
              _KDB,
              _runtimeState,
              { reason: "parameterRestore", runId: payload.runId }
            );
            result = _resyncApply.settleResult(diagnostics, reconcileResult, progress);
            if (reconcileResult && isFinite(Number(reconcileResult.generation))) {
              result.inventoryGeneration = Number(reconcileResult.generation);
            }
          }
        }
      }
      if (result && result.ok === false) {
        return _runtime.mergeTerminalCleanup(_KDB, payload, result, { reportAlreadyReleased: false });
      }
      if (result && result.ok !== false) {
        _view.handleCommittedDisplay(_KDB);
      }
      return result || _resyncApply.settleResult(diagnostics, null, progress);
    } catch (error) {
      if (error && error.cancelledResult) {
        return _runtime.mergeTerminalCleanup(
          _KDB,
          _payload || {},
          _resyncApply.normalizeResult(error.cancelledResult),
          { reportAlreadyReleased: false }
        );
      }
      return _runtime.mergeTerminalCleanup(_KDB, _payload || {}, {
          ok: false,
          degraded: false,
          applied: [],
          skipped: [],
          diagnostics: [{
            code: _config.parameterSetCodes.RESYNC_FAILED,
            message: "singleSelect resync failed: " + String(error && error.message ? error.message : error)
          }]
        }, { reportAlreadyReleased: false }
      );
    }
  }

  return handleParameterSetResync;
});

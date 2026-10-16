define([
  "../../config/parameterSetCodes.js",
  "./parameterSetRuntime.js",
  "./restoreEntryHandlers.js",
  "../reconcileFilterInstances.js",
  "./recordRestoreOutcome.js"
], function (_codes, _runtime, _entryHandlers, _reconcileFilterInstances, _results) {
  "use strict";

  async function runParameterSetRestore(_KDB, _payload, _runtimeState) {
    try {
      var payload = _payload || {};
      var guardResult = _runtime.guardRun(_KDB, payload);
      var phase = payload.phase;
      var result = { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] };
      var filters = Array.isArray(payload.filters) ? payload.filters : [];
      var generation = _KDB.state.filters.singleSelect.inventory ? _KDB.state.filters.singleSelect.inventory.generation : 0;
      var writebackGate;
      if (guardResult) {
        return guardResult;
      }
      writebackGate = _runtime.ensureWritebackPinnedGeneration(_KDB, payload);
      if (!writebackGate.ok) {
        return _results.hardSkipResult(
          result,
          writebackGate.code || _codes.INVENTORY_STALE,
          writebackGate.message
        );
      }
      if (!_runtime.validateInventoryGeneration(
        _KDB, payload.runId, payload.inventoryGeneration, generation
      )) {
        return _results.hardSkipResult(
          result,
          payload.source === "writebackSet" ? _codes.INVENTORY_STALE : _codes.CANCELLED,
          "stale inventoryGeneration for restore run"
        );
      }
      if (phase !== "global" && phase !== "pageContext") {
        return _results.hardSkipResult(result, _codes.INVALID_PHASE, "invalid phase \"" + String(phase) + "\"");
      }
      if (!_runtime.readAppliedPageContext(_KDB, payload.runId)) {
        _runtime.resetAppliedPageContext(_KDB, payload.runId);
      }
      for (var idx = 0; idx < filters.length; idx += 1) {
        try {
          var stale = await _entryHandlers.applyEntry(
            _KDB,
            _runtimeState,
            payload,
            filters[idx],
            phase,
            result
          );
          if (stale === true) {
            return _results.cancelledMidRun(result, payload.runId, _codes.CANCELLED);
          }
        } catch (error) {
          _results.skip(result, filters[idx] ? filters[idx].tab : undefined,
            filters[idx] && filters[idx].key != null ? String(filters[idx].key) : "",
            _codes.RESTORE_FAILED, "restore apply failed: " + String(error && error.message ? error.message : error), true);
        }
      }
      if (writebackGate.shouldBypassReconcile === true) {
        return result;
      }
      var reconcileResult = await _reconcileFilterInstances(
        _KDB,
        _runtimeState,
        { reason: "parameterRestore", runId: payload.runId }
      );
      return mergeReconcileOutcome(result, reconcileResult);
    } catch (error) {
      return {
        ok: false,
        degraded: false,
        applied: [],
        skipped: [],
        diagnostics: [{
          code: _codes.RESTORE_FAILED,
          message: "singleSelect runParameterSetRestore failed: " +
            String(error && error.message ? error.message : error)
        }]
      };
    }
  }

  function mergeReconcileOutcome(_result, _reconcileResult) {
    var reconcileDiagnostics = _reconcileResult && Array.isArray(_reconcileResult.diagnostics)
      ? _reconcileResult.diagnostics : [];
    if (_reconcileResult && _reconcileResult.ok === false) {
      _result.ok = false;
    }
    if (_reconcileResult && _reconcileResult.degraded === true) {
      _result.degraded = true;
    }
    _result.diagnostics = (_result.diagnostics || []).concat(reconcileDiagnostics);
    return _result;
  }

  async function handleParameterSetRestore(_KDB, _payload, _runtimeState) {
    try {
      var result = await runParameterSetRestore(_KDB, _payload, _runtimeState);
      if (result && result.ok === false) {
        return _runtime.mergeTerminalCleanup(_KDB, _payload || {}, result, {
          reportAlreadyReleased: false
        });
      }
      return result;
    } catch (error) {
      console.error("[singleSelect.handleParameterSetRestore] failed", {
        runId: _payload && _payload.runId
      }, error);
      return _runtime.mergeTerminalCleanup(_KDB, _payload || {}, {
        ok: false,
        degraded: false,
        applied: [],
        skipped: [],
        diagnostics: [{
          code: _codes.RESTORE_FAILED,
          message: String(error && error.message ? error.message : error)
        }]
      }, { reportAlreadyReleased: false });
    }
  }

  return handleParameterSetRestore;
});

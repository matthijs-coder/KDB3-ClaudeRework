define([
  "../../config.js",
  "./parameterSetRuntimeRegistry.js",
  "./parameterSetWritebackGenerationGuards.js"
], function (_config, _registry, _writebackGuards) {
  "use strict";

  function cancelled(_message) {
    return {
      ok: false,
      degraded: false,
      applied: [],
      skipped: [],
      diagnostics: [{ code: _config.parameterSetCodes.CANCELLED, message: _message }]
    };
  }

  function guardRun(_KDB, _payload) {
    var payload = _payload || {};
    var runtime = _registry.ensureRuntime(_KDB);
    if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
      return cancelled("singleSelect parameterSet action requires a numeric runId");
    }
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      return cancelled("stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId);
    }
    if (typeof runtime.parameterSetRunId === "number" && payload.runId > runtime.parameterSetRunId) {
      runtime.pendingPromises.parameterSetRuns = {};
    }
    runtime.parameterSetRunId = payload.runId;
    return null;
  }

  function isStale(_KDB, _runId) {
    var runtime = _registry.ensureRuntime(_KDB);
    return typeof runtime.parameterSetRunId === "number" && _runId < runtime.parameterSetRunId;
  }

  function cancelledResult() {
    return cancelled("singleSelect parameterSet run was cancelled or superseded");
  }

  function validateInventoryGeneration(_KDB, _runId, _generation, _currentGeneration) {
    var registry = _registry.ensureRunRegistry(_KDB, _runId);
    if (registry.inventoryGeneration == null) {
      if (_generation != null && Number(_generation) !== Number(_currentGeneration)) {
        return false;
      }
      registry.inventoryGeneration = _generation == null ? _currentGeneration : Number(_generation);
    }
    return Number(registry.inventoryGeneration) === Number(_generation == null
      ? registry.inventoryGeneration : _generation);
  }

  function normalizeResult(_result) {
    var result = _result || {};
    return {
      ok: result.ok === true,
      degraded: result.degraded === true,
      applied: Array.isArray(result.applied) ? result.applied.slice() : [],
      skipped: Array.isArray(result.skipped) ? result.skipped.slice() : [],
      diagnostics: Array.isArray(result.diagnostics) ? result.diagnostics.slice() : []
    };
  }

  function mergeTerminalCleanup(_KDB, _payload, _result, _options) {
    var payload = _payload || {};
    var result = normalizeResult(_result);
    if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
      return result;
    }
    var settleRun = _registry.settleParameterSetRun(_KDB, payload.runId, _options || {});
    var diagnostics = Array.isArray(settleRun.diagnostics) ? settleRun.diagnostics : [];
    if (!settleRun.ok) {
      result.ok = false;
    }
    if (diagnostics.length > 0) {
      result.degraded = true;
      result.diagnostics = result.diagnostics.concat(diagnostics);
    }
    return result;
  }

  return {
    ensureRuntime: _registry.ensureRuntime,
    guardRun: guardRun,
    isStale: isStale,
    cancelledResult: cancelledResult,
    resetAppliedPageContext: _registry.resetAppliedPageContext,
    registerAppliedPageContext: _registry.registerAppliedPageContext,
    readAppliedPageContext: _registry.readAppliedPageContext,
    validateInventoryGeneration: validateInventoryGeneration,
    ensureWritebackPinnedGeneration: _writebackGuards.ensureWritebackPinnedGeneration,
    validateMutationGuard: _writebackGuards.validateMutationGuard,
    settleParameterSetRun: _registry.settleParameterSetRun,
    isRunFinishOutcome: _registry.isRunFinishOutcome,
    mergeTerminalCleanup: mergeTerminalCleanup
  };
});

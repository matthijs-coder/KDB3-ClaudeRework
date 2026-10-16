define(["../config.js", "../runtime.js"], function (_config, _singleSelectRuntime) {
  "use strict";

  var RUN_FINISH_OUTCOMES = Object.freeze({
    success: true,
    failure: true,
    cancelled: true,
    abortedByOwner: true
  });
  var ALLOWED_FINISH_KEYS = Object.freeze({
    runId: true,
    source: true,
    outcome: true
  });

  function ensureRuntime(_KDB) {
    var runtime = _singleSelectRuntime.ensureSingleSelectRuntime(_KDB);
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

  function buildRunReleaseAck(_ok, _runId, _released, _alreadyReleased, _diagnostics) {
    return {
      ok: _ok === true,
      runId: _runId,
      released: _released === true,
      alreadyReleased: _alreadyReleased === true,
      diagnostics: Array.isArray(_diagnostics) ? _diagnostics.slice() : []
    };
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
    var runtime = ensureRuntime(_KDB);
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
    var runtime = ensureRuntime(_KDB);
    return typeof runtime.parameterSetRunId === "number" && _runId < runtime.parameterSetRunId;
  }

  function cancelledResult() {
    return cancelled("singleSelect parameterSet run was cancelled or superseded");
  }

  function validateInventoryGeneration(_KDB, _runId, _generation, _currentGeneration) {
    var registry = ensureRunRegistry(_KDB, _runId);
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
    var settleRun = settleParameterSetRun(_KDB, payload.runId, _options || {});
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

  function settleFailure(_runId, _diagnostics) {
    return {
      ok: false,
      runId: typeof _runId === "number" && isFinite(_runId) ? _runId : null,
      released: false,
      alreadyReleased: false,
      diagnostics: (_diagnostics || []).slice()
    };
  }

  function isStrictPayload(_payload) {
    if (!_payload || typeof _payload !== "object") {
      return false;
    }
    return Object.keys(_payload).every(function (key) {
      return ALLOWED_FINISH_KEYS[key] === true;
    }) &&
      Object.prototype.hasOwnProperty.call(_payload, "runId") &&
      Object.prototype.hasOwnProperty.call(_payload, "source") &&
      Object.prototype.hasOwnProperty.call(_payload, "outcome") &&
      typeof _payload.source === "string" &&
      typeof _payload.outcome === "string";
  }

  async function handleParameterSetRunFinished(_KDB, _runtime, _payload) {
    try {
      var payload = _payload || {};
      var diagnostics = [];
      if (!isStrictPayload(payload)) {
        diagnostics.push({
          code: _config.parameterSetCodes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished payload must contain only runId/source/outcome"
        });
        return Promise.resolve(settleFailure(null, diagnostics));
      }
      if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
        diagnostics.push({
          code: _config.parameterSetCodes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished requires a finite numeric runId"
        });
        return Promise.resolve(settleFailure(null, diagnostics));
      }
      if (payload.source !== "writebackSet") {
        diagnostics.push({
          code: _config.parameterSetCodes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished requires source \"writebackSet\""
        });
        return Promise.resolve(settleFailure(payload.runId, diagnostics));
      }
      if (!isRunFinishOutcome(payload.outcome)) {
        diagnostics.push({
          code: _config.parameterSetCodes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished outcome is invalid"
        });
        return Promise.resolve(settleFailure(payload.runId, diagnostics));
      }
      return Promise.resolve(settleParameterSetRun(_KDB, payload.runId));
    } catch (error) {
      return Promise.resolve(settleFailure(null, [{
        code: _config.parameterSetCodes.RUN_FINISH_INVALID,
        message: "singleSelect parameterSetRunFinished failed: " +
          String(error && error.message ? error.message : error)
      }]));
    }
  }

  return {
    ensureRunRegistry: ensureRunRegistry,
    resetAppliedPageContext: resetAppliedPageContext,
    registerAppliedPageContext: registerAppliedPageContext,
    readAppliedPageContext: readAppliedPageContext,
    isRunFinishOutcome: isRunFinishOutcome,
    buildRunReleaseAck: buildRunReleaseAck,
    settleParameterSetRun: settleParameterSetRun,
    guardRun: guardRun,
    isStale: isStale,
    cancelledResult: cancelledResult,
    validateInventoryGeneration: validateInventoryGeneration,
    normalizeResult: normalizeResult,
    mergeTerminalCleanup: mergeTerminalCleanup,
    handleParameterSetRunFinished: handleParameterSetRunFinished
  };
});

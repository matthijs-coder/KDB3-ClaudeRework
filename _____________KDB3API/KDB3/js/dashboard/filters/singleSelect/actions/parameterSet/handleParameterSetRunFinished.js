define([
  "../../config/parameterSetCodes.js",
  "./parameterSetRuntime.js"
], function (_codes, _runtime) {
  "use strict";

  var ALLOWED_KEYS = Object.freeze({
    runId: true,
    source: true,
    outcome: true
  });

  async function handleParameterSetRunFinished(_KDB, _payload) {
    try {
      var payload = _payload || {};
      var diagnostics = [];
      if (!isStrictPayload(payload)) {
        diagnostics.push({
          code: _codes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished payload must contain only runId/source/outcome"
        });
        return Promise.resolve(settleFailure(null, diagnostics));
      }
      if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
        diagnostics.push({
          code: _codes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished requires a finite numeric runId"
        });
        return Promise.resolve(settleFailure(null, diagnostics));
      }
      if (payload.source !== "writebackSet") {
        diagnostics.push({
          code: _codes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished requires source \"writebackSet\""
        });
        return Promise.resolve(settleFailure(payload.runId, diagnostics));
      }
      if (!_runtime.isRunFinishOutcome(payload.outcome)) {
        diagnostics.push({
          code: _codes.RUN_FINISH_INVALID,
          message: "singleSelect parameterSetRunFinished outcome is invalid"
        });
        return Promise.resolve(settleFailure(payload.runId, diagnostics));
      }
      return Promise.resolve(_runtime.settleParameterSetRun(_KDB, payload.runId));
    } catch (error) {
      return Promise.resolve(settleFailure(null, [{
        code: _codes.RUN_FINISH_INVALID,
        message: "singleSelect parameterSetRunFinished failed: " +
          String(error && error.message ? error.message : error)
      }]));
    }
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
      return ALLOWED_KEYS[key] === true;
    }) &&
      Object.prototype.hasOwnProperty.call(_payload, "runId") &&
      Object.prototype.hasOwnProperty.call(_payload, "source") &&
      Object.prototype.hasOwnProperty.call(_payload, "outcome") &&
      typeof _payload.source === "string" &&
      typeof _payload.outcome === "string";
  }

  return handleParameterSetRunFinished;
});

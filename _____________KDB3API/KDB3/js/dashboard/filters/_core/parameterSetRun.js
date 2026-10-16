/*
 * Filter owner kit: the parameterSet run guard (runtime.parameterSetRunId) the owners share.
 *
 * claimParameterSetRun(runtime, runId, options) -> null | { reason, runId, current, message }
 *     null: the run is accepted and runtime.parameterSetRunId is stamped with runId.
 *     reason "invalid": runId is not a finite number; message = options.invalidMessage.
 *     reason "stale": runId is older than the stamped id; message = "stale parameterSet runId <id> superseded by <current>".
 *     options.onAdvance(previousRunId) runs when a newer run replaces a numeric stamp, before the new stamp.
 *     The owner turns a rejection into its own cancelled result: the shapes differ per owner and stay there.
 * isStaleParameterSetRun(runtime, runId) -> boolean
 *     True when a newer run has been stamped since runId was accepted.
 */
define([], function () {
  "use strict";

  function claimParameterSetRun(_runtime, _runId, _options) {
    var options = _options || {};
    var current = _runtime.parameterSetRunId;
    if (typeof _runId !== "number" || !isFinite(_runId)) {
      return { reason: "invalid", runId: _runId, current: current, message: options.invalidMessage };
    }
    if (typeof current === "number" && _runId < current) {
      return {
        reason: "stale",
        runId: _runId,
        current: current,
        message: "stale parameterSet runId " + _runId + " superseded by " + current
      };
    }
    if (typeof current === "number" && _runId > current && typeof options.onAdvance === "function") {
      options.onAdvance(current);
    }
    _runtime.parameterSetRunId = _runId;
    return null;
  }

  function isStaleParameterSetRun(_runtime, _runId) {
    return typeof _runtime.parameterSetRunId === "number" && _runId < _runtime.parameterSetRunId;
  }

  return {
    claimParameterSetRun: claimParameterSetRun,
    isStaleParameterSetRun: isStaleParameterSetRun
  };
});

define([], function () {
  "use strict";

  // Run bookkeeping shared by the filter owners (runtime.tabMutationRunId / tabMutationOperationId).
  // options: pinOperationId (the active run is bound to its operationId), ensureRunIdDefault0 (seed the runtime keys),
  // includeRunIdsInDiagnostic, missingIdsMessage, supersededMessage, operationMismatchMessage.
  // isStale options: staleMode "pinned" (a newer run or another operation makes it stale) | "runId" (only the run id).

  var CANCELLED_CODE = "TABS_MUTATION_CANCELLED";

  function cancelled(_message, _payload, _runtime, _opts) {
    var opts = _opts || {};
    var diagnostic = { code: CANCELLED_CODE, message: _message };
    if (opts.includeRunIdsInDiagnostic === true) {
      diagnostic.runId = _payload && _payload.runId;
      diagnostic.currentRunId = _runtime && _runtime.tabMutationRunId;
    }
    return {
      ok: false,
      errorCode: CANCELLED_CODE,
      diagnostics: [diagnostic]
    };
  }

  function guardRun(_runtime, _payload, _opts) {
    var opts = _opts || {};
    var payload = _payload || {};
    if (opts.ensureRunIdDefault0 === true) {
      _runtime.tabMutationRunId = typeof _runtime.tabMutationRunId === "number" ? _runtime.tabMutationRunId : 0;
      _runtime.tabMutationSnapshots = _runtime.tabMutationSnapshots || {};
    }
    var runId = payload.runId;
    if (typeof runId !== "number" || !isFinite(runId) || !payload.operationId) {
      return cancelled(opts.missingIdsMessage, payload, _runtime, opts);
    }
    if (typeof _runtime.tabMutationRunId === "number" && runId < _runtime.tabMutationRunId) {
      return cancelled(opts.supersededMessage, payload, _runtime, opts);
    }
    if (opts.pinOperationId === true && _runtime.tabMutationRunId === runId &&
      _runtime.tabMutationOperationId && _runtime.tabMutationOperationId !== payload.operationId) {
      return cancelled(opts.operationMismatchMessage, payload, _runtime, opts);
    }
    _runtime.tabMutationRunId = runId;
    if (opts.pinOperationId === true) {
      _runtime.tabMutationOperationId = payload.operationId;
    }
    return null;
  }

  function isStale(_runtime, _payload, _opts) {
    var opts = _opts || {};
    if (opts.staleMode === "pinned") {
      var runId = _payload && _payload.runId;
      var operationId = _payload && _payload.operationId;
      if (typeof runId !== "number" || !isFinite(runId)) { return true; }
      if (typeof _runtime.tabMutationRunId === "number" && _runtime.tabMutationRunId !== runId) {
        return true;
      }
      if (_runtime.tabMutationOperationId && operationId &&
        _runtime.tabMutationOperationId !== operationId) {
        return true;
      }
      return false;
    }
    return !(_payload && typeof _payload.runId === "number" &&
      _runtime && _runtime.tabMutationRunId === _payload.runId);
  }

  return {
    cancelled: cancelled,
    guardRun: guardRun,
    isStale: isStale
  };
});

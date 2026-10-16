define(["../schema/errorCodes.js"], function (_errorCodes) {
  "use strict";

  // Local copy of the status default; restoreConstants.normalizeStatus replaces it once both tasks are merged.
  function normalizeStatus(status) {
    return status === undefined || status === null ? "notDefaultParamSet" : String(status);
  }

  function toBridgeDiagnostic(error) {
    if (error && error.diagnostic) {
      return error.diagnostic;
    }
    return _errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD, "bridge",
      String(error && error.message ? error.message : error), {}, 0
    );
  }

  function failureResult(status, diagnostics) {
    return { ok: false, status: status, runId: 0, outcome: "failed", diagnostics: diagnostics, phases: [] };
  }

  function cancelledResult(status) {
    return { ok: false, status: status, runId: 0, outcome: "cancelled", diagnostics: [], phases: [] };
  }

  return {
    normalizeStatus: normalizeStatus,
    toBridgeDiagnostic: toBridgeDiagnostic,
    failureResult: failureResult,
    cancelledResult: cancelledResult
  };
});

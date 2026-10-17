define(["../schema/errorCodes.js", "../set/config/restoreConstants.js"], function (_errorCodes, _restoreConstants) {
  "use strict";

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
    normalizeStatus: _restoreConstants.normalizeStatus,
    toBridgeDiagnostic: toBridgeDiagnostic,
    failureResult: failureResult,
    cancelledResult: cancelledResult
  };
});

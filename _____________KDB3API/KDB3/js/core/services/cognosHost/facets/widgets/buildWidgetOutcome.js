define([], function () {
  "use strict";

  // Copy of the four outcome classes (design doc section 3.4 / contract
  // section 4). Filters keeps its own copy: this slice does not rewrite
  // accepted slice-1 files to share a helper (no shared/ folder).

  function buildOk(_data) {
    return { ok: true, outcome: "ok", data: _data };
  }

  function buildDegraded(_data, _diagnostics) {
    return {
      ok: true,
      outcome: "degraded",
      data: _data,
      diagnostics: Array.isArray(_diagnostics) ? _diagnostics : []
    };
  }

  function buildAborted(_reason) {
    return { ok: false, outcome: "aborted", reason: _reason || "aborted" };
  }

  function buildDisposed() {
    return { ok: false, outcome: "aborted", reason: "disposed" };
  }

  function buildFailed(_errorCode, _diagnostics) {
    return {
      ok: false,
      outcome: "failed",
      errorCode: _errorCode,
      diagnostics: Array.isArray(_diagnostics) ? _diagnostics : []
    };
  }

  function buildDiagnostic(_code, _message) {
    return { code: _code, message: _message == null ? "" : String(_message) };
  }

  return {
    buildOk: buildOk,
    buildDegraded: buildDegraded,
    buildAborted: buildAborted,
    buildDisposed: buildDisposed,
    buildFailed: buildFailed,
    buildDiagnostic: buildDiagnostic
  };
});

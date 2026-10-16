define([], function () {
  "use strict";

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

define([], function () {
  "use strict";

  function messageFromError(err) {
    return String(err && err.message ? err.message : err);
  }

  function failure(errorCode, errorMessage, diagnostics) {
    return { ok: false, status: "error", errorCode: errorCode, errorMessage: errorMessage || errorCode, diagnostics: diagnostics };
  }

  function staleAborted(diagnostics) {
    return { ok: false, status: "aborted", errorCode: "WIDGET_TOPN_STALE_OPERATION", diagnostics: diagnostics || null };
  }

  function staleOperation(ownerVisId, opSeq) {
    return { ok: false, ownerVisId: ownerVisId, opSeq: opSeq, status: "aborted", stale: true, errorCode: "WIDGET_TOPN_STALE_OPERATION" };
  }

  function ownerIdConflict() {
    return { ok: false, status: "error", errorCode: "WIDGET_TOPN_OWNER_ID_CONFLICT" };
  }

  function isAborted(signal) {
    return !!(signal && signal.aborted);
  }

  function isAbortError(err) {
    return !!(err && err.name === "AbortError");
  }

  function normalizeDispatchResult(_result) {
    var result = _result || {};
    return {
      ok: result.ok === true,
      outcome: result.outcome,
      reason: result.reason,
      ownerVisId: result.ownerVisId,
      helperWidgetId: result.helperWidgetId === undefined ? null : result.helperWidgetId,
      opSeq: result.opSeq,
      status: result.status || null,
      stale: result.stale === true,
      terminalDispatched: result.terminalDispatched === true,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      diagnostics: result.diagnostics
    };
  }

  return {
    messageFromError: messageFromError,
    failure: failure,
    staleAborted: staleAborted,
    staleOperation: staleOperation,
    ownerIdConflict: ownerIdConflict,
    isAborted: isAborted,
    isAbortError: isAbortError,
    normalizeDispatchResult: normalizeDispatchResult
  };
});

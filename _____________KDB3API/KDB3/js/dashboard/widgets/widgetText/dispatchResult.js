define([], function () {
  "use strict";

  function failureResult(_widgetId, _opSeq, _errorCode, _err) {
    return {
      ok: false,
      widgetId: _widgetId,
      opSeq: _opSeq,
      status: "error",
      errorCode: _errorCode,
      errorMessage: _err ? String(_err.message || _err) : undefined
    };
  }

  function staleResult(_widgetId, _opSeq) {
    return { ok: false, widgetId: _widgetId, opSeq: _opSeq, stale: true, status: "aborted" };
  }

  function normalizeDispatchResult(_result) {
    var result = _result || {};
    return {
      ok: result.ok === true,
      outcome: result.outcome,
      reason: result.reason,
      widgetId: result.widgetId,
      opSeq: result.opSeq,
      skipped: result.skipped === true,
      stale: result.stale === true,
      status: result.status || null,
      reportToSettings: result.reportToSettings,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      diagnostics: result.diagnostics,
      reasonCode: result.reasonCode
    };
  }

  return {
    failureResult: failureResult,
    staleResult: staleResult,
    normalizeDispatchResult: normalizeDispatchResult
  };
});

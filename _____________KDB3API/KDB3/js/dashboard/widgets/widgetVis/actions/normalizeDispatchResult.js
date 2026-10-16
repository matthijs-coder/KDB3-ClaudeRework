define([], function () {
  "use strict";

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
      ready: result.ready === true,
      reportToSettings: result.reportToSettings,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      diagnostics: result.diagnostics
    };
  }

  return normalizeDispatchResult;
});

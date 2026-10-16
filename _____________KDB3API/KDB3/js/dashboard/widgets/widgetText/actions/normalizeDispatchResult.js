define([], function () {
  function __controller(_result, _fallback) {
    var result = _result || _fallback || {};
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
  return __controller;
});

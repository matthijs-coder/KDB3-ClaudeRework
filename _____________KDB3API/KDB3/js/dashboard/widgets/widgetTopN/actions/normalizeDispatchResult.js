define([], function () {
  "use strict";

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

  return normalizeDispatchResult;
});

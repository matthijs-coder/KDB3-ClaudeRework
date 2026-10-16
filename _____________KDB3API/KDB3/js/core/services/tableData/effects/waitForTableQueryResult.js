define(["./readDataQueryFacet.js"], function (_readDataQueryFacet) {
  "use strict";

  function toAbortError() {
    var error = new Error("Aborted");
    error.name = "AbortError";
    return error;
  }

  function outcomeError(_outcome) {
    var code = _outcome && _outcome.errorCode ? _outcome.errorCode : "DATAQUERY_WAIT_TIMEOUT";
    var diagnostic = _outcome && _outcome.diagnostics && _outcome.diagnostics[0]
      ? _outcome.diagnostics[0].message
      : "";
    return new Error(diagnostic || code);
  }

  // Cheap poll only — same contract as pre-slice-4 waitForTableQueryResult:
  // resolve when the host result has items, do not flatten, do not fetch twice.
  function waitForTableQueryResult(_KDB, _widgetId, _timeout, _interval, _signal) {
    var facet = _readDataQueryFacet(_KDB);
    var budgetMs = _timeout != null ? _timeout : Infinity;
    var intervalMs = _interval != null ? _interval : 100;
    if (!facet || typeof facet.waitForQueryResult !== "function") {
      return Promise.reject(new Error("waitForTableQueryResult: dataQueryFacet.waitForQueryResult missing"));
    }
    return facet.waitForQueryResult(_widgetId, {
      budgetMs: budgetMs,
      intervalMs: intervalMs,
      signal: _signal || null
    }).then(function (outcome) {
      if (outcome && outcome.ok === true) {
        return {
          loaded: true,
          rowCount: outcome.data && typeof outcome.data.rowCount === "number" ? outcome.data.rowCount : 0,
          isEmpty: !!(outcome.data && outcome.data.isEmpty)
        };
      }
      if (outcome && outcome.outcome === "aborted") {
        return Promise.reject(toAbortError());
      }
      return Promise.reject(outcomeError(outcome));
    });
  }

  return waitForTableQueryResult;
});

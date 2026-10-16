define(["./readDataQueryFacet.js"], function (_readDataQueryFacet) {
  "use strict";

  function isAbortOutcome(_outcome) {
    return _outcome && _outcome.outcome === "aborted";
  }

  async function readTableQueryResult(_KDB, _widgetId, _options) {
    var options = _options || {};
    var signal = options.signal || null;
    var facet;
    var outcome;
    try {
      if (!_widgetId || (signal && signal.aborted)) {
        return { status: signal && signal.aborted ? "aborted" : "empty", result: null };
      }
      facet = _readDataQueryFacet(_KDB);
      if (!facet || typeof facet.readQueryRows !== "function") {
        return { status: "failed", result: null, error: new Error("dataQueryFacet missing") };
      }
      outcome = await facet.readQueryRows(_widgetId, {
        budgetMs: 60000,
        intervalMs: 100,
        signal: signal
      });
      if (signal && signal.aborted) {
        return { status: "aborted", result: null };
      }
      if (isAbortOutcome(outcome)) {
        return { status: "aborted", result: null };
      }
      if (!outcome || outcome.ok !== true) {
        return {
          status: "failed",
          result: null,
          error: new Error(outcome && outcome.errorCode ? outcome.errorCode : "DATAQUERY_READ_FAILED")
        };
      }
      return { status: "ready", result: outcome.data || null };
    } catch (error) {
      if ((error && (error.name === "AbortError" || error.code === "ABORT_ERR")) || (signal && signal.aborted)) {
        return { status: "aborted", result: null };
      }
      console.error("[tableDataService.readTableQueryResult] query read failed", error);
      return { status: "failed", result: null, error: error };
    }
  }

  return readTableQueryResult;
});

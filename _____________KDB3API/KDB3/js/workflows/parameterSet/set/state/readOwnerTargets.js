define([
  "../../../../core/config/writebackErrorCodes.js",
], function (_errorCodes) {
  "use strict";

  // Cross-owner readers for restore targets. Reads go through owner getState()
  // snapshots (state.mdc read pattern); never through raw _KDB.state writes.

  // Header owner delta return contract: { ok, status: "idle"|"active"|"removed", diagnostics }.
  function readHeaderStatus(_KDB, headerPhaseResult) {
    if (headerPhaseResult && headerPhaseResult.result && typeof headerPhaseResult.result.status === "string") {
      return headerPhaseResult.result.status;
    }
    try {
      const headerApi = _KDB && _KDB.api ? _KDB.api.header : null;
      if (headerApi && typeof headerApi.getState === "function") {
        const state = headerApi.getState();
        if (state && typeof state.status === "string") {
          return state.status;
        }
      }
    } catch (error) {
      console.warn("[writebackSet] readHeaderStatus via header getState failed", error);
    }
    return null;
  }

  // §6.4: tabIdx -> { tabId, pageId, scopeId? } lookup, from tabs restore
  // result or current tabs owner state when tabs is omitted.
  function resolveTabTargets(_KDB, run, tabsPhaseResult) {
    if (tabsPhaseResult && tabsPhaseResult.result && tabsPhaseResult.result.tabTargets) {
      run.recordPhase("tabTargetResolve", "tabs", true);
      return tabsPhaseResult.result.tabTargets;
    }
    try {
      const tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
      if (tabsApi && typeof tabsApi.getState === "function") {
        const state = tabsApi.getState();
        if (state && typeof state === "object") {
          run.recordPhase("tabTargetResolve", "tabs", true);
          // Skeleton: the tabs owner delta defines the concrete lookup shape;
          // until then the raw owner snapshot is handed through unmodified.
          return state.tabTargets || null;
        }
      }
    } catch (error) {
      console.warn("[writebackSet] resolveTabTargets failed", error);
    }
    run.recordPhase("tabTargetResolve", "tabs", false, false, [_errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_TABS_NOT_READY, "restore",
      "tabIdx -> tabId/pageId lookup could not be resolved from tabs owner state",
      {}, run.runId
    )]);
    return null;
  }

  return Object.freeze({
    readHeaderStatus: readHeaderStatus,
    resolveTabTargets: resolveTabTargets,
  });
});

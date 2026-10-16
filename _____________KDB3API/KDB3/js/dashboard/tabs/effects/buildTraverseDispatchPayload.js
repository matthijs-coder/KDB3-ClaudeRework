define(["../config/defaults.js"], function (_defaults) {
  "use strict";

  function normalizeOptions(payload) {
    const options = payload || {};
    return {
      source: options.source || "api",
      scope: options.scope || "visibleDashboard",
      tabIndex: typeof options.tabIndex === "number" && options.tabIndex === Math.floor(options.tabIndex) ? options.tabIndex : null,
      includeHiddenDashboardTabs: options.includeHiddenDashboardTabs === true,
      includeHelperTabs: options.includeHelperTabs === true,
      restoreActiveTab: options.restoreActiveTab !== false,
      restoreTabIndex: typeof options.restoreTabIndex === "number" ? options.restoreTabIndex : null,
      waitFor: options.waitFor || "canvas",
      timeoutMs: typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : _defaults.HYDRATE_TIMEOUT_MS
    };
  }

  function buildConfirmedPayload(state, traversedIndexes, canvasLoadedByIndex, activeIndex, options) {
    const activeTab = state.byIndex && state.byIndex[String(activeIndex)];
    return {
      phase: "confirmed",
      traversedIndexes: traversedIndexes,
      canvasLoadedByIndex: canvasLoadedByIndex,
      activeIndex: activeIndex,
      activeTabId: activeTab && activeTab.tabId || state.activeTabId || null,
      currentTabId: activeTab && activeTab.tabId || state.currentTabId || null,
      lastTraversedAt: Date.now(),
      scope: options.scope,
      source: options.source,
      activationSource: options.source,
      errorCode: null,
      errorMessage: null
    };
  }

  function buildFailedPayload(errorCode, errorMessage, options) {
    return {
      phase: "failed",
      traversedIndexes: [],
      canvasLoadedByIndex: {},
      activeIndex: null,
      activeTabId: null,
      currentTabId: null,
      lastTraversedAt: Date.now(),
      scope: options && options.scope || null,
      source: options && options.source || null,
      errorCode: errorCode || "TABS_TRAVERSE_FAILED",
      errorMessage: errorMessage || null
    };
  }

  normalizeOptions.buildConfirmedPayload = buildConfirmedPayload;
  normalizeOptions.buildFailedPayload = buildFailedPayload;
  return normalizeOptions;
});

define(["../config/defaults.js", "../slots.js"], function (_defaults, _slots) {
  "use strict";

  function normalizeTraverseOptions(payload) {
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

  // Two dispatches with the same key share one in-flight traversal.
  function buildTraverseKey(options) {
    return [
      options.scope,
      options.tabIndex,
      options.includeHiddenDashboardTabs,
      options.includeHelperTabs,
      options.restoreActiveTab,
      options.restoreTabIndex,
      options.waitFor
    ].join("|");
  }

  function collectTargetIndexes(state, options) {
    if (options.scope === "singleTab") {
      return typeof options.tabIndex === "number" ? [options.tabIndex] : [];
    }
    const order = Array.isArray(state.order) ? state.order : [];
    return order.filter(function (tabIndex) {
      return shouldTraverseTab(state.byIndex && state.byIndex[String(tabIndex)], tabIndex, options);
    });
  }

  function shouldTraverseTab(tab, tabIndex, options) {
    if (!tab) { return false; }
    if (!_slots.isDashboardTab(tab)) {
      return options.includeHelperTabs === true;
    }
    if (options.scope === "singleTab") {
      return tabIndex === options.tabIndex && (tab.visible === true || options.includeHiddenDashboardTabs === true);
    }
    if (options.scope === "visibleDashboard") {
      return tab.visible === true;
    }
    if (options.scope === "allDashboard") {
      return tab.visible === true || options.includeHiddenDashboardTabs === true;
    }
    return false;
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

  // Without options, scope/source stay null so the reducer keeps the previous traversal scope/source.
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

  return {
    normalizeTraverseOptions: normalizeTraverseOptions,
    buildTraverseKey: buildTraverseKey,
    collectTargetIndexes: collectTargetIndexes,
    shouldTraverseTab: shouldTraverseTab,
    buildConfirmedPayload: buildConfirmedPayload,
    buildFailedPayload: buildFailedPayload
  };
});

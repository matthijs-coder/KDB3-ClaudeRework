define(["../config/defaults.js"], function (_defaults) {
  "use strict";

  function collectTargetIndexes(state, options) {
    const order = Array.isArray(state.order) ? state.order : [];
    if (options.scope === "singleTab") {
      return typeof options.tabIndex === "number" ? [options.tabIndex] : [];
    }
    const indexes = [];
    let index = 0;
    while (index < order.length) {
      const tabIndex = order[index];
      const tab = state.byIndex && state.byIndex[String(tabIndex)];
      if (shouldTraverseTab(tab, tabIndex, options)) {
        indexes.push(tabIndex);
      }
      index += 1;
    }
    return indexes;
  }

  function shouldTraverseTab(tab, tabIndex, options) {
    if (!tab) { return false; }
    if (!isDashboardTab(tab)) {
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

  function isDashboardTab(tab) {
    if (!tab) { return false; }
    if (tab.role) { return tab.role === "dashboard"; }
    return tab.isHelper !== true && tab.index < _defaults.MAX_USER_TABS;
  }

  collectTargetIndexes.shouldTraverseTab = shouldTraverseTab;
  return collectTargetIndexes;
});

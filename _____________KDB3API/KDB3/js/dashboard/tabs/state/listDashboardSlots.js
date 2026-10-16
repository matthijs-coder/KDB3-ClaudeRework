define(["../config/defaults.js"], function (_defaults) {
  "use strict";

  // Pure helper: dashboard-role tabs in tabIdx order. The array position of
  // each returned tab IS its writeback tabIdx (state.order filtered to
  // dashboard tabs), matching the GET-side convention in collectTabs.js.
  function listDashboardSlots(_state) {
    const state = _state || {};
    const order = Array.isArray(state.order) ? state.order : [];
    const byIndex = state.byIndex || {};
    return order
      .map(function (physicalIndex) { return byIndex[String(physicalIndex)]; })
      .filter(function (tab) { return isDashboardTab(tab, state); });
  }

  function isDashboardTab(tab, state) {
    if (!tab) { return false; }
    if (tab.role) { return tab.role === "dashboard"; }
    // Same live source as the GET side (collectTabs.js) so tabIdx conventions
    // cannot diverge; static default only as fallback.
    const maxUserTabs = state.limits && typeof state.limits.maxUserTabs === "number"
      ? state.limits.maxUserTabs : _defaults.MAX_USER_TABS;
    return tab.isHelper !== true && tab.index < maxUserTabs;
  }

  return listDashboardSlots;
});

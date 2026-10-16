define(["./config/defaults.js"], function (_defaults) {
  "use strict";

  // A tab without a role counts as a dashboard tab when it is not the helper and
  // sits below maxUserTabs (state.limits when given, as collectTabs.js does on the GET side).
  function isDashboardTab(tab, state) {
    if (!tab) { return false; }
    if (tab.role) { return tab.role === "dashboard"; }
    const limits = state && state.limits;
    const maxUserTabs = limits && typeof limits.maxUserTabs === "number" ? limits.maxUserTabs : _defaults.MAX_USER_TABS;
    return tab.isHelper !== true && tab.index < maxUserTabs;
  }

  function isVisibleUserTab(tab) {
    return !!tab && tab.visible === true && isDashboardTab(tab);
  }

  function isRenamableUserTab(tab) {
    return isVisibleUserTab(tab) && !!tab.tabId;
  }

  function findTabById(byIndex, tabId) {
    const keys = Object.keys(byIndex || {});
    let position = 0;
    while (position < keys.length) {
      const tab = byIndex[keys[position]];
      if (tab && tab.tabId === tabId) { return tab; }
      position += 1;
    }
    return null;
  }

  // Dashboard-role tabs in tabIdx order: the array position of each tab IS its
  // writeback tabIdx, matching the GET-side convention in collectTabs.js.
  function listDashboardSlots(_state) {
    const state = _state || {};
    const order = Array.isArray(state.order) ? state.order : [];
    const byIndex = state.byIndex || {};
    return order
      .map(function (physicalIndex) { return byIndex[String(physicalIndex)]; })
      .filter(function (tab) { return isDashboardTab(tab, state); });
  }

  function resolveDashboardOrderIndex(state, tabIndex) {
    const slots = listDashboardSlots(state);
    let position = 0;
    while (position < slots.length) {
      if (slots[position].index === tabIndex) { return position; }
      position += 1;
    }
    return null;
  }

  function countVisible(slots) {
    return slots.filter(function (slot) { return slot.visible === true; }).length;
  }

  function readTabRole(_KDB, index) {
    const tabsConfig = _KDB && _KDB.config ? _KDB.config.tabs : null;
    const entry = tabsConfig && tabsConfig[String(index)];
    return entry && entry.role ? entry.role : null;
  }

  return {
    isDashboardTab: isDashboardTab,
    isVisibleUserTab: isVisibleUserTab,
    isRenamableUserTab: isRenamableUserTab,
    findTabById: findTabById,
    listDashboardSlots: listDashboardSlots,
    resolveDashboardOrderIndex: resolveDashboardOrderIndex,
    countVisible: countVisible,
    readTabRole: readTabRole
  };
});

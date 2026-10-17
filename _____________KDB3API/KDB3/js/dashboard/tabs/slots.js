define(["../../core/utils/tabSlots.js"], function (_tabSlots) {
  "use strict";

  // The rules live in core/utils/tabSlots.js (writeback shares them); a tab without a role counts as a dashboard tab
  // when it is not the helper and sits below maxUserTabs (state.limits when given).
  const isDashboardTab = _tabSlots.isDashboardTab;
  const listDashboardSlots = _tabSlots.listDashboardSlots;

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

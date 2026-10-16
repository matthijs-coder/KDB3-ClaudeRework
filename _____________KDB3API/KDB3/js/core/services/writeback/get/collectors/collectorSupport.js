define([
  "../../../../../dashboard/tabs/config/defaults.js",
], function (_tabsDefaults) {
  "use strict";

  function assignOptionalFlag01(target, compactKey, value) {
    if (typeof value !== "boolean") {
      return;
    }
    target[compactKey] = value ? 1 : 0;
  }

  function trimUseValue(selection) {
    return selection && typeof selection.useValue === "string" ? selection.useValue.trim() : "";
  }

  function isKnownUnsupportedKey(rawKey) {
    const key = String(rawKey == null ? "" : rawKey).trim().toLowerCase();
    return key === "sicht" || key === "dienststelle" || key === "dienststelle_bw" || key === "dienststelle_dezpv";
  }

  // Tab-role rule shared by the tabs and widgets collectors and the persist landing; P2 replaces it with a tabs selector.
  function isDashboardTab(tab, state) {
    if (!tab) {
      return false;
    }
    if (tab.role) {
      return tab.role === "dashboard";
    }
    const maxUserTabs = state && state.limits && typeof state.limits.maxUserTabs === "number"
      ? state.limits.maxUserTabs : _tabsDefaults.MAX_USER_TABS;
    return tab.isHelper !== true && tab.index < maxUserTabs;
  }

  function readApiState(_KDB, owner) {
    const api = _KDB && _KDB.api ? _KDB.api[owner] : null;
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  return Object.freeze({
    assignOptionalFlag01: assignOptionalFlag01,
    trimUseValue: trimUseValue,
    isKnownUnsupportedKey: isKnownUnsupportedKey,
    isDashboardTab: isDashboardTab,
    readApiState: readApiState,
  });
});

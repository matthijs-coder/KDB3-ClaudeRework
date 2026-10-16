define(["../../../tabs/state/selectors.js"], function (_tabsSelectors) {
  "use strict";

  function readActiveTabIdFromSelector(_KDB) {
    try {
      var selectorValue = _tabsSelectors && _tabsSelectors.readActiveTabId
        ? _tabsSelectors.readActiveTabId(_KDB)
        : null;
      return selectorValue == null ? "" : String(selectorValue).trim();
    } catch (error) {
      console.error("[filterDock.readActiveTabIdFromSelector] failed", error);
      throw error;
    }
  }

  function readActiveTabIdFromCompatFallback(_KDB) {
    try {
      if (!(_KDB && _KDB.utils && typeof _KDB.utils.readCurrentTab === "function")) {
        return "";
      }
      var tab = _KDB.utils.readCurrentTab();
      return tab && tab.id ? String(tab.id).trim() : "";
    } catch (error) {
      console.error("[filterDock.readActiveTabIdFromCompatFallback] failed", error);
      throw error;
    }
  }

  function readScopeContext(_KDB, _scopeType) {
    try {
      var activeTabId;
      if (_scopeType === "global") {
        return {
          tabId: null,
          scopeId: "global",
          scopeResolution: "global",
          legacyScope: "global",
          legacyScopeId: "global",
          tabContextDiagnostic: null
        };
      }
      activeTabId = readActiveTabIdFromSelector(_KDB);
      if (activeTabId) {
        return {
          tabId: activeTabId,
          scopeId: null,
          scopeResolution: "ownerRequired",
          legacyScope: activeTabId,
          legacyScopeId: activeTabId,
          tabContextDiagnostic: null
        };
      }
      activeTabId = readActiveTabIdFromCompatFallback(_KDB);
      if (activeTabId) {
        return {
          tabId: activeTabId,
          scopeId: null,
          scopeResolution: "ownerRequired",
          legacyScope: activeTabId,
          legacyScopeId: activeTabId,
          tabContextDiagnostic: "FILTER_DOCK_TAB_CONTEXT_DEGRADED"
        };
      }
      return {
        tabId: null,
        scopeId: null,
        scopeResolution: "ownerRequired",
        legacyScope: "unknown",
        legacyScopeId: "unknown",
        tabContextDiagnostic: "FILTER_DOCK_TAB_CONTEXT_MISSING"
      };
    } catch (error) {
      console.error("[filterDock.readScopeContext] failed", {
        scopeType: _scopeType
      }, error);
      throw error;
    }
  }

  function readRuntimeScope(_KDB, _scopeType) {
    try {
      var scopeContext = readScopeContext(_KDB, _scopeType);
      if (_scopeType === "global") {
        return "global";
      }
      return scopeContext.tabId || "pageContext";
    } catch (error) {
      throw error;
    }
  }

  return {
    readScopeContext: readScopeContext,
    readRuntimeScope: readRuntimeScope
  };
});

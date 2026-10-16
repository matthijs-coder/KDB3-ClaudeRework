define([], function () {
  "use strict";

  function readTabsState(_KDB) {
    var api = _KDB && _KDB.api && _KDB.api.tabs;
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  function readVisibleTabsManifest(_KDB) {
    var state = readTabsState(_KDB);
    var visibleTabs;
    if (!state || !Array.isArray(state.visibleTabs)) {
      return {
        activeIndex: null,
        tabs: [],
        errorCode: "DASHBOARD_PDF_VISIBLE_TABS_UNAVAILABLE",
        errorMessage: "tabs.getState() did not provide the canonical visibleTabs projection."
      };
    }
    visibleTabs = state.visibleTabs;
    return {
      activeIndex: typeof (state && state.activeIndex) === "number" ? state.activeIndex : null,
      tabs: visibleTabs.map(function (tab) {
        return {
          index: tab.index,
          tabId: tab.tabId || null,
          pageId: tab.pageId || null,
          name: tab.name || "Unbenannter Tab"
        };
      })
    };
  }

  return readVisibleTabsManifest;
});

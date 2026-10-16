define(["./lookupDienststelleFilterRef.js", "../../../tabs/state/selectors.js"], function (_lookup, _tabsSelectors) {
  "use strict";

  function __controller(_KDB, _pageScopeId) {
    try {
      var canonical;
      var activeFilterKey;
      var raw;
      if (_pageScopeId == null || _pageScopeId === "" || _pageScopeId === "global") {
        return null;
      }
      if (_pageScopeId === "active") {
        canonical = _tabsSelectors.readActiveTabId(_KDB);
        if (!canonical) {
          return null;
        }
      } else {
        canonical = _pageScopeId;
      }
      activeFilterKey = _KDB && _KDB.state && _KDB.state.filters && _KDB.state.filters.dienststelle
        ? _KDB.state.filters.dienststelle.activeFilterKey
        : null;
      raw = _lookup.resolveRawPageContextScope(_KDB, activeFilterKey, canonical);
      if (raw == null || String(raw) === "") {
        return null;
      }
      return String(raw);
    } catch (error) {
      console.error("[dienststelle.resolvePlannerPageScopeId] failed", error);
      throw error;
    }
  }

  return __controller;
});

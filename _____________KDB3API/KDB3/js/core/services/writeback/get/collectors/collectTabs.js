define([
  "../../schema/errorCodes.js",
  "../../../../../dashboard/tabs/state/selectors.js",
  "./collectorSupport.js",
], function (_errorCodes, _tabsSelectors, _support) {
  "use strict";

  // GET collector for v3 `tabs` per contracts/writeback.md §4.4 and
  // writeback-get-visibleDashboard-contractdelta.md (shells, choice B).
  // In-memory walk of dashboard-role slots (helper excluded). No click.
  // Emits every dashboard slot in physical order so wgts.tab / filt.*.tab
  // stay indexes into this full tabs[]; hidden shells are { name, hide: 1 }.
  // Content collect lives in other GET collectors and is visible-only.
  // Never persists tabId/pageId (§4.4 caution).
  function collectTabs(_KDB, diagnostics) {
    const state = _tabsSelectors.readTabsState(_KDB);
    if (!state || !state.byIndex || Object.keys(state.byIndex).length === 0) {
      return {};
    }
    const orderedTabs = readOrderedDashboardTabs(state);
    if (orderedTabs.length === 0) {
      return {};
    }

    const entries = [];
    for (let position = 0; position < orderedTabs.length; position++) {
      const tab = orderedTabs[position];
      const name = typeof tab.name === "string" ? tab.name : "";
      if (name === "") {
        diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "get",
          "tab without a name encountered; tabs omitted to keep positional entries valid",
          { tabIndex: tab.index }
        ));
        return {};
      }
      entries.push(tab.visible === true ? { name: name } : { name: name, hide: 1 });
    }

    return { tabs: entries };
  }

  function readOrderedDashboardTabs(state) {
    const order = Array.isArray(state.order) ? state.order : [];
    return order
      .map(function (index) { return state.byIndex[String(index)]; })
      .filter(function (tab) { return _support.isDashboardTab(tab, state); });
  }

  return collectTabs;
});

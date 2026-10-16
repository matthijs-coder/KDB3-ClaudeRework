define(["./createInitialTabsState.js", "./buildTabTargets.js", "./buildTabsReadProjection.js", "./readTabScopeMatch.js"], function (_createInitialTabsState, _buildTabTargets, _buildTabsReadProjection, _readTabScopeMatch) {
  "use strict";

  const selectors = {
    readTabsState: readTabsState,
    readTabTargets: readTabTargets,
    readActiveTabId: readActiveTabId,
    readActiveTabIndex: readActiveTabIndex,
    readVisibleTabs: readVisibleTabs,
    readTabByIndex: readTabByIndex,
    readTabById: readTabById,
    readTabScopeMatch: readTabScopeMatch,
    readTabEditTarget: readTabEditTarget,
    readTabsForLaunchpad: readTabsForLaunchpad,
    readTabsForKdbControl: readTabsForKdbControl
  };

  function readTabsState(_KDB) {
    const state = _KDB && _KDB.state && _KDB.state.tabs ? _KDB.state.tabs : _createInitialTabsState();
    return _buildTabsReadProjection.cloneState(state);
  }

  // Pure tabTargets projection (no scopeId) for readOwnerTargets.resolveTabTargets;
  // scopeId-carrying targets come from the parameterSet action results (delta §3.1).
  function readTabTargets(_KDB) {
    return _buildTabTargets(readRawState(_KDB) || _createInitialTabsState());
  }

  function readActiveTabId(_KDB) {
    const state = readRawState(_KDB);
    return state ? state.activeTabId || state.currentTabId || null : null;
  }

  function readActiveTabIndex(_KDB) {
    const state = readRawState(_KDB);
    return state && typeof state.activeIndex === "number" ? state.activeIndex : null;
  }

  function readVisibleTabs(_KDB) {
    const state = readRawState(_KDB);
    if (!state) { return []; }
    return _buildTabsReadProjection.readVisibleTabs(state);
  }

  function readTabByIndex(_KDB, _tabIndex) {
    const state = readRawState(_KDB);
    const tab = state && state.byIndex ? state.byIndex[String(_tabIndex)] : null;
    return tab ? _buildTabsReadProjection.cloneTab(tab) : null;
  }

  function readTabById(_KDB, _tabId) {
    const state = readRawState(_KDB);
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const tab = _buildTabsReadProjection.findTabById(byIndex, _tabId);
    return tab ? _buildTabsReadProjection.cloneTab(tab) : null;
  }

  function readTabScopeMatch(_KDB, _scopeId, _liveTabTargets) {
    return _readTabScopeMatch(readRawState(_KDB), _scopeId, _liveTabTargets);
  }

  function readTabEditTarget(_KDB) {
    const state = readRawState(_KDB);
    const target = state && state.editTarget;
    return target && typeof target.tabIndex === "number" ? { tabIndex: target.tabIndex, tabId: target.tabId || null } : null;
  }

  function readTabsForLaunchpad(_KDB) {
    return readVisibleTabs(_KDB).map(function (tab) {
      return { tabId: tab.tabId, pageId: tab.pageId, index: tab.index, name: tab.name, isActive: tab.isActive === true };
    });
  }

  function readTabsForKdbControl(_KDB) {
    const state = readRawState(_KDB) || _createInitialTabsState();
    return _buildTabsReadProjection.readTabsForKdbControl(state);
  }

  function readRawState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.tabs : null;
  }

  return selectors;
});

define([
  "./state.js",
  "./slots.js",
  "../../core/utils/tabSlots.js"
], function (_state, _slots, _tabSlots) {
  "use strict";

  // Read functions for the tabs state; the only file other modules import for reads.
  // Every read returns copies, never the live state.

  function readTabsState(_KDB) {
    return cloneState(readRawState(_KDB) || _state.createInitialTabsState());
  }

  // Pure tabTargets projection (no scopeId) for readOwnerTargets.resolveTabTargets; scopeId-carrying targets
  // come from the parameterSet action results (delta section 3.1).
  function readTabTargets(_KDB) {
    return buildTabTargets(readRawState(_KDB) || _state.createInitialTabsState());
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
    return state ? visibleTabsOf(state) : [];
  }

  function readTabByIndex(_KDB, _tabIndex) {
    const state = readRawState(_KDB);
    const tab = state && state.byIndex ? state.byIndex[String(_tabIndex)] : null;
    return tab ? _state.cloneTab(tab) : null;
  }

  function readTabById(_KDB, _tabId) {
    const state = readRawState(_KDB);
    const tab = _slots.findTabById(state && state.byIndex ? state.byIndex : {}, _tabId);
    return tab ? _state.cloneTab(tab) : null;
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
    return projectForKdbControl(readRawState(_KDB) || _state.createInitialTabsState());
  }

  function readRawState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.tabs : null;
  }

  // { [tabIdx]: { tabId, pageId, scopeId?, visible } } per contracts/tabs-parameterSetRestore-contractdelta.md
  // section 3: tabIdx is the position within state.order filtered to dashboard tabs (as on the GET side,
  // writeback collectTabs.js). Entries without a scopeId omit the field.
  function buildTabTargets(_tabsState, _scopeIdsByTabIdx) {
    const scopeIds = _scopeIdsByTabIdx || {};
    const targets = {};
    _slots.listDashboardSlots(_tabsState).forEach(function (tab, tabIdx) {
      const target = { tabId: tab.tabId || null, pageId: tab.pageId || null, visible: tab.visible === true };
      const scopeId = scopeIds[String(tabIdx)];
      if (typeof scopeId === "string" && scopeId !== "") { target.scopeId = scopeId; }
      targets[String(tabIdx)] = target;
    });
    return targets;
  }

  function cloneState(state) {
    const clone = Object.assign({}, state, {
      byIndex: {},
      order: Array.isArray(state.order) ? state.order.slice() : [],
      visibleOrder: Array.isArray(state.visibleOrder) ? state.visibleOrder.slice() : [],
      helperTab: Object.assign({}, state.helperTab || {}),
      limits: Object.assign({}, state.limits || {}),
      traversal: Object.assign({}, state.traversal || {}, {
        traversedIndexes: state.traversal && Array.isArray(state.traversal.traversedIndexes) ? state.traversal.traversedIndexes.slice() : []
      }),
      hydration: Object.assign({}, state.hydration || {}),
      editUi: Object.assign({}, state.editUi || {}),
      pendingOperation: state.pendingOperation ? Object.assign({}, state.pendingOperation) : null
    });
    Object.keys(state.byIndex || {}).forEach(function (key) { clone.byIndex[key] = _state.cloneTab(state.byIndex[key]); });
    return Object.assign(clone, buildCoarseProjection(state));
  }

  function buildCoarseProjection(state) {
    return Object.assign(projectForKdbControl(state), {
      lifecycle: state.lifecycle,
      activeIndex: state.activeIndex,
      activeTabId: state.activeTabId,
      currentTabId: state.currentTabId,
      editTarget: state.editTarget ? Object.assign({}, state.editTarget) : null,
      tabTargets: buildTabTargets(state)
    });
  }

  function projectForKdbControl(state) {
    const editUi = state.editUi || {};
    const visibleEditTabIndexes = orderedTabs(state)
      .filter(function (tab) { return _slots.isRenamableUserTab(tab); })
      .map(function (tab) { return tab.index; });
    return {
      visibleTabs: visibleTabsOf(state),
      visibleEditTabIndexes: visibleEditTabIndexes,
      toolboxTabEditLineIndex: state.toolboxTabEditLineIndex == null ? null : state.toolboxTabEditLineIndex,
      selectedTool: state.selectedTool === "rename" ? "rename" : null,
      canAdd: orderedTabs(state).some(function (tab) { return _slots.isDashboardTab(tab) && tab.visible !== true; }),
      editUi: {
        toolboxVisible: editUi.toolboxVisible === true,
        activeTool: editUi.activeTool === "rename" ? "rename" : null,
        sessionTabIndex: editUi.sessionTabIndex == null ? null : editUi.sessionTabIndex,
        sessionTabId: editUi.sessionTabId || null,
        isEditingLabel: editUi.isEditingLabel === true,
        visibleEditTabIndexes: visibleEditTabIndexes
      },
      actions: buildActions(state)
    };
  }

  function buildActions(state) {
    const editUi = state.editUi || {};
    const renamePayload = typeof editUi.sessionTabIndex === "number" ? { tabIndex: editUi.sessionTabIndex } : {};
    const canRename = !!resolveRenameTarget(state, renamePayload);
    return { rename: { enabled: canRename, reason: canRename ? null : "noTarget" } };
  }

  function resolveRenameTarget(state, payload) {
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const editUi = state && state.editUi ? state.editUi : {};
    if (typeof editUi.sessionTabIndex === "number" && _slots.isRenamableUserTab(byIndex[String(editUi.sessionTabIndex)])) {
      return byIndex[String(editUi.sessionTabIndex)];
    }
    const explicitIndex = readExplicitTabIndex(payload);
    if (typeof explicitIndex === "number" && _slots.isRenamableUserTab(byIndex[String(explicitIndex)])) { return byIndex[String(explicitIndex)]; }
    if (payload.tabId && _slots.isRenamableUserTab(_slots.findTabById(byIndex, payload.tabId))) {
      return _slots.findTabById(byIndex, payload.tabId);
    }
    return _slots.isRenamableUserTab(byIndex[String(state && state.activeIndex)]) ? byIndex[String(state.activeIndex)] : null;
  }

  function readExplicitTabIndex(payload) {
    if (Object.prototype.hasOwnProperty.call(payload, "physicalTabIndex")) { return payload.physicalTabIndex; }
    return Object.prototype.hasOwnProperty.call(payload, "tabIndex") ? payload.tabIndex : null;
  }

  function orderedTabs(state) {
    const order = Array.isArray(state && state.order) ? state.order : [];
    return order.map(function (index) { return state.byIndex && state.byIndex[String(index)]; }).filter(Boolean).map(_state.cloneTab);
  }

  function visibleTabsOf(state) {
    return orderedTabs(state).filter(function (tab) { return tab.visible === true && _slots.isDashboardTab(tab); });
  }

  // The matcher lives in core/utils/tabSlots.js (writeback maps scopes through it on the published state).
  function readTabScopeMatch(_KDB, _scopeId, _liveTabTargets) {
    return _tabSlots.matchTabScope(readRawState(_KDB), _scopeId, _liveTabTargets);
  }

  return {
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
    readTabsForKdbControl: readTabsForKdbControl,
    buildTabTargets: buildTabTargets
  };
});

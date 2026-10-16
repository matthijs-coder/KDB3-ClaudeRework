define([
  "./state.js",
  "./slots.js",
  "../../core/utils/normalizeCognosScopeId.js"
], function (_state, _slots, _normalizeCognosScopeId) {
  "use strict";

  // Read functions for the tabs state; the only file other modules import for reads (state/selectors.js is the
  // path-preserving shim). Every read returns copies, never the live state.

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
    return {
      rename: { enabled: canRename, reason: canRename ? null : "noTarget" },
      delete: { enabled: false, reason: "deferred" },
      duplicate: { enabled: false, reason: "deferred" },
      move: { enabled: false, reason: "deferred" },
      reorder: { enabled: false, reason: "deferred" }
    };
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

  function readTabScopeMatch(_KDB, _scopeId, _liveTabTargets) {
    const requestedScopeId = _scopeId == null ? "" : String(_scopeId);
    const normalizedScopeId = _normalizeCognosScopeId(requestedScopeId);
    const missing = { status: "missing", evidence: null, scopeId: requestedScopeId, tab: null, candidates: [] };
    if (!normalizedScopeId) { return missing; }

    const candidates = indexCandidatesByTabIdx(readRawState(_KDB));
    const stages = [
      { evidence: "liveScope", matches: readLiveScopeMatches(candidates, _liveTabTargets, normalizedScopeId) },
      { evidence: "alias", matches: readAliasMatches(candidates, normalizedScopeId) }
    ];
    for (let position = 0; position < stages.length; position += 1) {
      const matches = stages[position].matches;
      if (matches.length === 1) {
        return { status: "ok", evidence: stages[position].evidence, scopeId: requestedScopeId, tab: flatCandidate(matches[0]), candidates: [] };
      }
      if (matches.length > 1) {
        return {
          status: "ambiguous",
          evidence: stages[position].evidence,
          scopeId: requestedScopeId,
          tab: null,
          candidates: matches.map(flatCandidate)
        };
      }
    }
    return missing;
  }

  function indexCandidatesByTabIdx(tabsState) {
    const indexed = {};
    _slots.listDashboardSlots(tabsState || {}).forEach(function (tab, tabIdx) {
      indexed[String(tabIdx)] = {
        tabId: tab && tab.tabId ? tab.tabId : null,
        pageId: tab && tab.pageId ? tab.pageId : null,
        index: tab && typeof tab.index === "number" ? tab.index : null,
        tabIdx: tabIdx,
        visible: !!(tab && tab.visible === true),
        name: tab && tab.name ? tab.name : null
      };
    });
    return indexed;
  }

  function readLiveScopeMatches(candidates, liveTabTargets, normalizedScopeId) {
    const map = liveTabTargets && typeof liveTabTargets === "object" ? liveTabTargets : {};
    return Object.keys(map).sort(compareNumeric).filter(function (tabIdx) {
      return _normalizeCognosScopeId((map[tabIdx] || {}).scopeId) === normalizedScopeId && !!candidates[tabIdx];
    }).map(function (tabIdx) { return candidates[tabIdx]; });
  }

  function readAliasMatches(candidates, normalizedScopeId) {
    return Object.keys(candidates).sort(compareNumeric).map(function (tabIdx) { return candidates[tabIdx]; }).filter(function (candidate) {
      return _normalizeCognosScopeId(candidate.tabId) === normalizedScopeId || _normalizeCognosScopeId(candidate.pageId) === normalizedScopeId;
    });
  }

  function flatCandidate(tab) {
    return { tabId: tab.tabId, pageId: tab.pageId, index: tab.index, tabIdx: tab.tabIdx, visible: tab.visible, name: tab.name };
  }

  function compareNumeric(left, right) {
    return Number(left) - Number(right);
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

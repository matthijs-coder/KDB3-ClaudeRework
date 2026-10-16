define(["./buildTabTargets.js", "../slots.js"], function (_buildTabTargets, _slots) {
  "use strict";

  function cloneState(state) {
    const clone = Object.assign({}, state, {
      byIndex: {},
      order: Array.isArray(state.order) ? state.order.slice() : [],
      visibleOrder: Array.isArray(state.visibleOrder) ? state.visibleOrder.slice() : [],
      helperTab: Object.assign({}, state.helperTab || {}),
      limits: Object.assign({}, state.limits || {}),
      traversal: Object.assign({}, state.traversal || {}, { traversedIndexes: state.traversal && Array.isArray(state.traversal.traversedIndexes) ? state.traversal.traversedIndexes.slice() : [] }),
      hydration: Object.assign({}, state.hydration || {}),
      editUi: Object.assign({}, state.editUi || {}),
      pendingOperation: state.pendingOperation ? Object.assign({}, state.pendingOperation) : null
    });
    Object.keys(state.byIndex || {}).forEach(function (key) { clone.byIndex[key] = cloneTab(state.byIndex[key]); });
    return Object.assign(clone, buildCoarseProjection(state));
  }

  function readVisibleTabs(state) {
    return readOrderedTabs(state).filter(function (tab) { return tab.visible === true && _slots.isDashboardTab(tab); });
  }

  function readTabsForKdbControl(state) {
    const editUi = state.editUi || {};
    const visibleEditTabIndexes = readOrderedTabs(state)
      .filter(function (tab) { return _slots.isRenamableUserTab(tab); })
      .map(function (tab) { return tab.index; });
    return {
      visibleTabs: readVisibleTabs(state),
      visibleEditTabIndexes: visibleEditTabIndexes,
      toolboxTabEditLineIndex: state.toolboxTabEditLineIndex == null ? null : state.toolboxTabEditLineIndex,
      selectedTool: state.selectedTool === "rename" ? "rename" : null,
      canAdd: canAddVisibleTab(state),
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

  function cloneTab(tab) {
    return Object.assign({}, tab || {}, { button: Object.assign({}, tab && tab.button || {}), edit: Object.assign({}, tab && tab.edit || {}) });
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

  function canAddVisibleTab(state) {
    return readOrderedTabs(state).some(function (tab) { return _slots.isDashboardTab(tab) && tab.visible !== true; });
  }

  function resolveRenameTarget(state, payload) {
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const editUi = state && state.editUi ? state.editUi : {};
    const source = payload || {};
    if (typeof editUi.sessionTabIndex === "number" && _slots.isRenamableUserTab(byIndex[String(editUi.sessionTabIndex)])) {
      return byIndex[String(editUi.sessionTabIndex)];
    }
    const explicitIndex = Object.prototype.hasOwnProperty.call(source, "physicalTabIndex") ? source.physicalTabIndex : Object.prototype.hasOwnProperty.call(source, "tabIndex") ? source.tabIndex : null;
    if (typeof explicitIndex === "number" && _slots.isRenamableUserTab(byIndex[String(explicitIndex)])) { return byIndex[String(explicitIndex)]; }
    if (source.tabId && _slots.isRenamableUserTab(_slots.findTabById(byIndex, source.tabId))) { return _slots.findTabById(byIndex, source.tabId); }
    return _slots.isRenamableUserTab(byIndex[String(state && state.activeIndex)]) ? byIndex[String(state.activeIndex)] : null;
  }

  function readOrderedTabs(state) {
    const order = Array.isArray(state && state.order) ? state.order : [];
    return order.map(function (index) { return state.byIndex && state.byIndex[String(index)]; }).filter(Boolean).map(cloneTab);
  }

  function buildCoarseProjection(state) {
    return Object.assign(readTabsForKdbControl(state), {
      lifecycle: state.lifecycle,
      activeIndex: state.activeIndex,
      activeTabId: state.activeTabId,
      currentTabId: state.currentTabId,
      editTarget: state.editTarget ? Object.assign({}, state.editTarget) : null,
      tabTargets: _buildTabTargets(state)
    });
  }

  return {
    cloneState: cloneState,
    readVisibleTabs: readVisibleTabs,
    readTabsForKdbControl: readTabsForKdbControl,
    findTabById: _slots.findTabById,
    cloneTab: cloneTab
  };
});

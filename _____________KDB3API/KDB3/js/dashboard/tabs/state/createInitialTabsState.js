define(["../config/defaults.js"], function (_defaults) {
  "use strict";

  function createInitialTabsState(_existingState) {
    const state = {
      lifecycle: "idle",
      byIndex: {},
      order: [],
      visibleOrder: [],
      activeIndex: null,
      activeTabId: null,
      currentTabId: null,
      editTarget: null,
      editUi: createEditUiState(),
      toolboxTabEditLineIndex: null,
      selectedTool: null,
      isAuthoringView: false,
      helperTab: createHelperTabState(),
      limits: createLimitsState(),
      traversal: createTraversalState(),
      hydration: createHydrationState(),
      pendingOperation: null,
      errorCode: null,
      errorMessage: null
    };
    return mergeExistingState(state, _existingState);
  }

  function createEditUiState() {
    return { toolboxVisible: false, activeTool: null, sessionTabIndex: null, sessionTabId: null, isEditingLabel: false, errorCode: null, errorMessage: null };
  }

  function createHelperTabState() {
    return { index: _defaults.HELPER_TAB_INDEX, tabId: null, pageId: null, lifecycle: "idle", errorCode: null, errorMessage: null };
  }

  function createLimitsState() {
    return { maxUserTabs: _defaults.MAX_USER_TABS, helperTabIndex: _defaults.HELPER_TAB_INDEX, minVisibleUserTabs: _defaults.MIN_VISIBLE_USER_TABS };
  }

  function createTraversalState() {
    return { lifecycle: "idle", traversedIndexes: [], lastTraversedAt: null, scope: null, source: null, errorCode: null, errorMessage: null };
  }

  function createHydrationState() {
    return { lifecycle: "idle", helperDomHydrated: false, lastSyncedAt: null, errorCode: null, errorMessage: null };
  }

  function mergeExistingState(state, _existingState) {
    const existing = _existingState || {};
    if (existing && typeof existing === "object") {
      state.isAuthoringView = existing.isAuthoringView === true;
      state.toolboxTabEditLineIndex = normalizeLineIndex(existing.toolboxTabEditLineIndex);
      state.selectedTool = existing.selectedTool === "rename" ? "rename" : null;
    }
    return state;
  }

  function normalizeLineIndex(value) {
    return typeof value === "number" && value >= 0 && value <= 4 && value === Math.floor(value) ? value : null;
  }

  return createInitialTabsState;
});

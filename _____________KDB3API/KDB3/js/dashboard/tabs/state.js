define(["./config/defaults.js", "./slots.js"], function (_defaults, _slots) {
  "use strict";

  // Initial tabs state and the pure copy helpers every tabs reducer shares.

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
      limits: {
        maxUserTabs: _defaults.MAX_USER_TABS,
        helperTabIndex: _defaults.HELPER_TAB_INDEX,
        minVisibleUserTabs: _defaults.MIN_VISIBLE_USER_TABS
      },
      traversal: {
        lifecycle: "idle",
        traversedIndexes: [],
        lastTraversedAt: null,
        scope: null,
        source: null,
        errorCode: null,
        errorMessage: null
      },
      hydration: { lifecycle: "idle", helperDomHydrated: false, lastSyncedAt: null, errorCode: null, errorMessage: null },
      pendingOperation: null,
      errorCode: null,
      errorMessage: null
    };
    return mergeExistingState(state, _existingState);
  }

  function createEditUiState() {
    return {
      toolboxVisible: false,
      activeTool: null,
      sessionTabIndex: null,
      sessionTabId: null,
      isEditingLabel: false,
      errorCode: null,
      errorMessage: null
    };
  }

  function createHelperTabState() {
    return { index: _defaults.HELPER_TAB_INDEX, tabId: null, pageId: null, lifecycle: "idle", errorCode: null, errorMessage: null };
  }

  function mergeExistingState(state, _existingState) {
    const existing = _existingState || {};
    state.isAuthoringView = existing.isAuthoringView === true;
    state.toolboxTabEditLineIndex = normalizeLineIndex(existing.toolboxTabEditLineIndex);
    state.selectedTool = existing.selectedTool === "rename" ? "rename" : null;
    return state;
  }

  function cloneByIndex(_byIndex) {
    const clone = {};
    Object.keys(_byIndex || {}).forEach(function (key) { clone[key] = cloneTab(_byIndex[key]); });
    return clone;
  }

  function cloneTab(_tab) {
    return copyObject(_tab || {}, { button: copyObject(_tab && _tab.button, {}), edit: copyObject(_tab && _tab.edit, {}) });
  }

  function cloneHelperTab(_helperTab) {
    return copyObject(createHelperTabState(), _helperTab || {});
  }

  function buildVisibleOrder(_byIndex, _order, _state) {
    return (_order || []).filter(function (index) {
      const tab = _byIndex[String(index)];
      return _slots.isDashboardTab(tab, _state) && tab.visible === true;
    });
  }

  function phaseToLifecycle(_phase) {
    if (_phase === "pending") { return "loading"; }
    if (_phase === "confirmed") { return "ready"; }
    if (_phase === "failed") { return "error"; }
    return "idle";
  }

  function normalizeLineIndex(_value) {
    return typeof _value === "number" && _value >= 0 && _value <= 4 && _value === Math.floor(_value) ? _value : null;
  }

  function valueOrNull(_value) {
    return typeof _value === "number" && _value === Math.floor(_value) ? _value : null;
  }

  function copyObject(_base, _patch) {
    return Object.assign({}, _base || {}, _patch || {});
  }

  function clearEditSessionFields(_editUi) {
    const cleared = {
      activeTool: null,
      sessionTabIndex: null,
      sessionTabId: null,
      isEditingLabel: false,
      errorCode: null,
      errorMessage: null
    };
    return copyObject(_editUi || createEditUiState(), cleared);
  }

  function markActive(_byIndex, _activeIndex) {
    Object.keys(_byIndex).forEach(function (key) { _byIndex[key].isActive = Number(key) === _activeIndex; });
  }

  return {
    createInitialTabsState: createInitialTabsState,
    createEditUiState: createEditUiState,
    cloneByIndex: cloneByIndex,
    cloneTab: cloneTab,
    cloneHelperTab: cloneHelperTab,
    buildVisibleOrder: buildVisibleOrder,
    phaseToLifecycle: phaseToLifecycle,
    normalizeLineIndex: normalizeLineIndex,
    valueOrNull: valueOrNull,
    copyObject: copyObject,
    clearEditSessionFields: clearEditSessionFields,
    markActive: markActive
  };
});

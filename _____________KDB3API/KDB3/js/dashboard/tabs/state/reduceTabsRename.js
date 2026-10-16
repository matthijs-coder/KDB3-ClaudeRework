define(["./copyTabsState.js"], function (_copyTabsState) {
  "use strict";

  function addVisibleTab(_state) {
    const order = _state.order || [];
    const byIndex = _copyTabsState.cloneByIndex(_state.byIndex);
    let index = 0;
    while (index < order.length) {
      const tab = byIndex[String(order[index])];
      if (_copyTabsState.isDashboardTab(tab) && tab.visible !== true) {
        byIndex[String(tab.index)] = _copyTabsState.copyObject(tab, { visible: true, button: _copyTabsState.copyObject(tab.button, { visible: true }) });
        const next = _copyTabsState.copyRoot(_state, { byIndex: byIndex, visibleOrder: _copyTabsState.buildVisibleOrder(byIndex, order), errorCode: null, errorMessage: null });
        return _copyTabsState.copyRoot(next, { editUi: recomputeEditUi(next, clearEditSessionFields(_state.editUi)) });
      }
      index += 1;
    }
    return _copyTabsState.copyRoot(_state, { errorCode: "TABS_NO_HIDDEN_TAB", errorMessage: "No hidden user tab is available." });
  }

  function selectEditTarget(_state, _payload) {
    const tabIndex = _copyTabsState.normalizeLineIndex(_payload.tabIndex);
    if (tabIndex == null) { return _state; }
    const tab = _state.byIndex && _state.byIndex[String(tabIndex)];
    if (_copyTabsState.isRenamableUserTab(tab)) {
      const sessionFields = { activeTool: "rename", sessionTabIndex: tab.index, sessionTabId: tab.tabId, isEditingLabel: true };
      const next = _copyTabsState.copyRoot(_state, { toolboxTabEditLineIndex: tabIndex, selectedTool: "rename", editTarget: null });
      return _copyTabsState.copyRoot(next, { editUi: recomputeEditUi(next, _copyTabsState.copyObject(clearEditSessionFields(_state.editUi), sessionFields)) });
    }
    const next = _copyTabsState.copyRoot(_state, { toolboxTabEditLineIndex: null, selectedTool: null, editTarget: null });
    return _copyTabsState.copyRoot(next, { editUi: recomputeEditUi(next, clearEditSessionFields(_state.editUi)) });
  }

  function setSelectedTool(_state, _tool, _lineIndex) {
    return _copyTabsState.copyRoot(_state, { selectedTool: _tool, toolboxTabEditLineIndex: _lineIndex, editTarget: null });
  }

  function updateRename(_state, _payload) {
    if (_payload.phase === "pending") {
      return _copyTabsState.copyRoot(_state, {
        pendingOperation: { type: "rename", source: _payload.source || null, tabIndex: _payload.tabIndex, tabId: _payload.tabId || null, name: _payload.name || "" }
      });
    }
    if (_payload.phase === "confirmed") {
      return commitRename(_state, _payload);
    }
    if (_payload.phase === "failed") {
      return failRename(_state, _payload);
    }
    return _state;
  }

  function commitRename(_state, _payload) {
    const byIndex = _copyTabsState.cloneByIndex(_state.byIndex);
    const key = String(_payload.tabIndex);
    const tab = byIndex[key];
    if (tab) {
      byIndex[key] = _copyTabsState.copyObject(tab, { name: _payload.confirmedName || _payload.name || tab.name, errorCode: null, errorMessage: null });
    }
    const preserveEditSession = _payload.preserveEditSession === true;
    // Session end also unchecks the kdbControl toolbox radio (legacy parity:
    // checked = false on focusout) — syncFrameworkViewFromState keys on this.
    const next = _copyTabsState.copyRoot(_state, {
      byIndex: byIndex,
      pendingOperation: null,
      toolboxTabEditLineIndex: preserveEditSession ? _state.toolboxTabEditLineIndex : null,
      selectedTool: preserveEditSession ? _state.selectedTool : null,
      errorCode: null,
      errorMessage: null
    });
    if (preserveEditSession) { return next; }
    return _copyTabsState.copyRoot(next, { editUi: recomputeEditUi(next, clearEditSessionFields(_state.editUi)) });
  }

  function failRename(_state, _payload) {
    const byIndex = _copyTabsState.cloneByIndex(_state.byIndex);
    const key = String(_payload.tabIndex);
    const tab = byIndex[key];
    if (tab) {
      byIndex[key] = _copyTabsState.copyObject(tab, { errorCode: _payload.errorCode || "TABS_RENAME_FAILED", errorMessage: _payload.errorMessage || null });
    }
    // Failed rename also ends the session: uncheck the toolbox radio too
    // (same reset as commitRename/cancelEditSession, otherwise the push-based
    // kdbControl sync keeps the radio checked).
    const next = _copyTabsState.copyRoot(_state, {
      byIndex: byIndex,
      pendingOperation: null,
      lifecycle: "error",
      toolboxTabEditLineIndex: null,
      selectedTool: null,
      errorCode: _payload.errorCode || "TABS_RENAME_FAILED",
      errorMessage: _payload.errorMessage || null
    });
    return _copyTabsState.copyRoot(next, { editUi: recomputeEditUi(next, clearEditSessionFields(_state.editUi)) });
  }

  function cancelEditSession(_state) {
    // Also uncheck the kdbControl toolbox radio (legacy parity, see commitRename).
    const next = _copyTabsState.copyRoot(_state, { toolboxTabEditLineIndex: null, selectedTool: null });
    return _copyTabsState.copyRoot(next, { editUi: recomputeEditUi(next, clearEditSessionFields(_state.editUi)) });
  }

  function createEditUiState() {
    return { toolboxVisible: false, activeTool: null, sessionTabIndex: null, sessionTabId: null, isEditingLabel: false, errorCode: null, errorMessage: null };
  }

  function clearEditSessionFields(_editUi) {
    const cleared = { activeTool: null, sessionTabIndex: null, sessionTabId: null, isEditingLabel: false, errorCode: null, errorMessage: null };
    return _copyTabsState.copyObject(_editUi || createEditUiState(), cleared);
  }

  function recomputeEditUi(_state, _editUiPatch) {
    const editUi = _copyTabsState.copyObject(_state.editUi || createEditUiState(), _editUiPatch || {});
    editUi.toolboxVisible = canShowEditToolbox(_state);
    return editUi;
  }

  function canShowEditToolbox(_state) {
    const byIndex = _state && _state.byIndex ? _state.byIndex : {};
    const order = Array.isArray(_state && _state.order) ? _state.order : [];
    let index = 0;
    while (index < order.length) {
      const tab = byIndex[String(order[index])];
      if (_copyTabsState.isRenamableUserTab(tab)) { return true; }
      index += 1;
    }
    return false;
  }

  return {
    addVisibleTab: addVisibleTab,
    selectEditTarget: selectEditTarget,
    setSelectedTool: setSelectedTool,
    updateRename: updateRename,
    cancelEditSession: cancelEditSession,
    createEditUiState: createEditUiState,
    clearEditSessionFields: clearEditSessionFields,
    recomputeEditUi: recomputeEditUi
  };
});

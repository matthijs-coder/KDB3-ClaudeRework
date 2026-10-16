define(["../state.js", "../slots.js"], function (_state, _slots) {
  "use strict";

  // Reducers for the rename edit session, the toolbox radio and adding a visible tab.

  function addVisibleTab(_current) {
    const order = _current.order || [];
    const byIndex = _state.cloneByIndex(_current.byIndex);
    const key = order.map(String).find(function (orderKey) {
      const tab = byIndex[orderKey];
      return _slots.isDashboardTab(tab) && tab.visible !== true;
    });
    if (key === undefined) {
      return _state.copyObject(_current, { errorCode: "TABS_NO_HIDDEN_TAB", errorMessage: "No hidden user tab is available." });
    }
    const tab = byIndex[key];
    byIndex[String(tab.index)] = _state.copyObject(tab, { visible: true, button: _state.copyObject(tab.button, { visible: true }) });
    const next = _state.copyObject(_current, {
      byIndex: byIndex,
      visibleOrder: _state.buildVisibleOrder(byIndex, order),
      errorCode: null,
      errorMessage: null
    });
    return withEditUi(next, _state.clearEditSessionFields(_current.editUi));
  }

  function selectEditTarget(_current, _payload) {
    const tabIndex = _state.normalizeLineIndex(_payload.tabIndex);
    if (tabIndex == null) { return _current; }
    const tab = _current.byIndex && _current.byIndex[String(tabIndex)];
    if (_slots.isRenamableUserTab(tab)) {
      const sessionFields = { activeTool: "rename", sessionTabIndex: tab.index, sessionTabId: tab.tabId, isEditingLabel: true };
      const next = _state.copyObject(_current, { toolboxTabEditLineIndex: tabIndex, selectedTool: "rename", editTarget: null });
      return withEditUi(next, _state.copyObject(_state.clearEditSessionFields(_current.editUi), sessionFields));
    }
    const next = _state.copyObject(_current, { toolboxTabEditLineIndex: null, selectedTool: null, editTarget: null });
    return withEditUi(next, _state.clearEditSessionFields(_current.editUi));
  }

  function setSelectedTool(_current, _tool, _lineIndex) {
    return _state.copyObject(_current, { selectedTool: _tool, toolboxTabEditLineIndex: _lineIndex, editTarget: null });
  }

  function updateRename(_current, _payload) {
    if (_payload.phase === "pending") {
      return _state.copyObject(_current, {
        pendingOperation: {
          type: "rename",
          source: _payload.source || null,
          tabIndex: _payload.tabIndex,
          tabId: _payload.tabId || null,
          name: _payload.name || ""
        }
      });
    }
    if (_payload.phase === "confirmed") { return commitRename(_current, _payload); }
    if (_payload.phase === "failed") { return failRename(_current, _payload); }
    return _current;
  }

  // Ending a session also unchecks the kdbControl toolbox radio (legacy parity: checked = false on focusout);
  // the push-based kdbControl sync keys on toolboxTabEditLineIndex and selectedTool.
  function commitRename(_current, _payload) {
    const byIndex = _state.cloneByIndex(_current.byIndex);
    const key = String(_payload.tabIndex);
    const tab = byIndex[key];
    if (tab) {
      byIndex[key] = _state.copyObject(tab, {
        name: _payload.confirmedName || _payload.name || tab.name,
        errorCode: null,
        errorMessage: null
      });
    }
    const preserveEditSession = _payload.preserveEditSession === true;
    const next = _state.copyObject(_current, {
      byIndex: byIndex,
      pendingOperation: null,
      toolboxTabEditLineIndex: preserveEditSession ? _current.toolboxTabEditLineIndex : null,
      selectedTool: preserveEditSession ? _current.selectedTool : null,
      errorCode: null,
      errorMessage: null
    });
    if (preserveEditSession) { return next; }
    return withEditUi(next, _state.clearEditSessionFields(_current.editUi));
  }

  function failRename(_current, _payload) {
    const byIndex = _state.cloneByIndex(_current.byIndex);
    const key = String(_payload.tabIndex);
    const tab = byIndex[key];
    if (tab) {
      byIndex[key] = _state.copyObject(tab, {
        errorCode: _payload.errorCode || "TABS_RENAME_FAILED",
        errorMessage: _payload.errorMessage || null
      });
    }
    const next = _state.copyObject(_current, {
      byIndex: byIndex,
      pendingOperation: null,
      lifecycle: "error",
      toolboxTabEditLineIndex: null,
      selectedTool: null,
      errorCode: _payload.errorCode || "TABS_RENAME_FAILED",
      errorMessage: _payload.errorMessage || null
    });
    return withEditUi(next, _state.clearEditSessionFields(_current.editUi));
  }

  function cancelEditSession(_current) {
    const next = _state.copyObject(_current, { toolboxTabEditLineIndex: null, selectedTool: null });
    return withEditUi(next, _state.clearEditSessionFields(_current.editUi));
  }

  function recomputeEditUi(_current, _editUiPatch) {
    const editUi = _state.copyObject(_current.editUi || _state.createEditUiState(), _editUiPatch || {});
    editUi.toolboxVisible = canShowEditToolbox(_current);
    return editUi;
  }

  function withEditUi(_current, _editUiPatch) {
    return _state.copyObject(_current, { editUi: recomputeEditUi(_current, _editUiPatch) });
  }

  function canShowEditToolbox(_current) {
    const byIndex = _current && _current.byIndex ? _current.byIndex : {};
    const order = Array.isArray(_current && _current.order) ? _current.order : [];
    return order.some(function (index) { return _slots.isRenamableUserTab(byIndex[String(index)]); });
  }

  return {
    addVisibleTab: addVisibleTab,
    selectEditTarget: selectEditTarget,
    setSelectedTool: setSelectedTool,
    updateRename: updateRename,
    cancelEditSession: cancelEditSession,
    recomputeEditUi: recomputeEditUi
  };
});

define(["../config/actionTypes.js", "./createInitialTabsState.js", "./reduceParameterSetApply.js", "./reduceActiveTabObserved.js", "./reduceTabMutationApply.js", "./reduceTabsSyncFromDom.js", "./reduceTabsTraversal.js", "./reduceTabsRename.js", "./copyTabsState.js"], function (_actionTypes, _createInitialTabsState, _reduceParameterSetApply, _reduceActiveTabObserved, _reduceTabMutationApply, _reduceTabsSyncFromDom, _reduceTabsTraversal, _reduceTabsRename, _copyTabsState) {
  "use strict";

  function reduceTabsAction(_state, _action) {
    const state = _state || _createInitialTabsState();
    const action = _action || {};
    const payload = action.payload || {};
    switch (action.type) {
      case _actionTypes.INITIALIZE:
        return initializeState(state);
      case _actionTypes.SYNC_FROM_DOM:
        return syncFromDom(state, payload);
      case _actionTypes.ACTIVE_TAB_OBSERVED:
        return _reduceActiveTabObserved.reduceActiveTabObserved(state, payload);
      case _actionTypes.HYDRATE_DOM:
        return updateHydration(state, payload);
      case _actionTypes.TRAVERSE:
        return updateTraversal(state, payload);
      case _actionTypes.ADD:
        return addVisibleTab(state);
      case _actionTypes.SELECT_EDIT_TARGET:
        return selectEditTarget(state, payload);
      case _actionTypes.SELECT_TOOL:
        return payload.tool === "rename" ? setSelectedTool(state, "rename", 0) : state;
      case _actionTypes.RENAME:
        return updateRename(state, payload);
      case _actionTypes.CANCEL_EDIT_SESSION:
        return cancelEditSession(state);
      case _actionTypes.PARAMETER_SET_APPLY:
        return _reduceParameterSetApply(state, payload);
      case _actionTypes.TAB_MUTATION_APPLY:
        return _reduceTabMutationApply(state, payload);
      case _actionTypes.AUTHORING_ENTERED:
        return copyRoot(state, { isAuthoringView: true });
      case _actionTypes.AUTHORING_EXITED:
        return copyRoot(state, { isAuthoringView: false });
      case _actionTypes.ERROR:
        return copyRoot(state, { lifecycle: "error", errorCode: payload.errorCode || "TABS_ERROR", errorMessage: payload.errorMessage || null });
      case _actionTypes.DESTROY:
        return copyRoot(state, { lifecycle: "disposed", pendingOperation: null, editUi: createEditUiState() });
      case _actionTypes.DELETE:
      case _actionTypes.DUPLICATE:
      case _actionTypes.RESTORE_DELETED:
      case _actionTypes.MOVE:
      case _actionTypes.REORDER:
        return state;
      default:
        return state;
    }
  }

  function initializeState(_state) { return _reduceTabsSyncFromDom.initializeState(_state); }
  function syncFromDom(_state, _payload) { return _reduceTabsSyncFromDom.syncFromDom(_state, _payload); }
  function updateHydration(_state, _payload) { return _reduceTabsSyncFromDom.updateHydration(_state, _payload); }
  function updateTraversal(_state, _payload) { return _reduceTabsTraversal.updateTraversal(_state, _payload); }
  function addVisibleTab(_state) { return _reduceTabsRename.addVisibleTab(_state); }
  function selectEditTarget(_state, _payload) { return _reduceTabsRename.selectEditTarget(_state, _payload); }
  function setSelectedTool(_state, _tool, _lineIndex) { return _reduceTabsRename.setSelectedTool(_state, _tool, _lineIndex); }
  function updateRename(_state, _payload) { return _reduceTabsRename.updateRename(_state, _payload); }
  function cancelEditSession(_state) { return _reduceTabsRename.cancelEditSession(_state); }
  function createEditUiState() { return _reduceTabsRename.createEditUiState(); }
  function copyRoot(_state, _patch) { return _copyTabsState.copyRoot(_state, _patch); }

  return reduceTabsAction;
});

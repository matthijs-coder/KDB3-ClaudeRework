define([
  "../config/actionTypes.js",
  "./bindTabRenameEditSession.js",
  "./syncTabsDomFromState.js",
  "./syncTabsKdbControlReadView.js",
  "../history/pushTabsRenameHistoryStep.js"
], function (_actionTypes, _bindTabRenameEditSession, _syncTabsDomFromState, _syncTabsKdbControlReadView, _pushTabsRenameHistoryStep) {
  "use strict";

  async function applyTabsRenameEffects(_ctx, _action) {
    try {
      const action = _action || {};
      if (action.type === _actionTypes.RENAME) { return renameTab(_ctx, action.payload || {}); }
      if (action.type === _actionTypes.SELECT_EDIT_TARGET) { return handleSelectEditTarget(_ctx, action.payload || {}); }
      if (action.type === _actionTypes.CANCEL_EDIT_SESSION) { return handleCancelEditSession(_ctx); }
      return true;
    } catch (err) {
      throw err;
    }
  }

  function handleSelectEditTarget(_ctx, payload) {
    const tabIndex = normalizeLineIndex(payload.tabIndex);
    _syncTabsKdbControlReadView(_ctx._KDB);
    const state = _ctx.getRawState();
    const tab = state.byIndex && state.byIndex[String(tabIndex)];
    if (tabIndex != null && isRenamableUserTab(tab)) {
      const started = _bindTabRenameEditSession.startTabRenameEditSession(_ctx);
      if (!started) {
        _ctx.dispatch({ type: _actionTypes.CANCEL_EDIT_SESSION, payload: { source: "tabEditUi" } });
        return false;
      }
      return true;
    }
    _bindTabRenameEditSession.commitOutgoingEditSession(_ctx);
    _bindTabRenameEditSession.cleanupTabRenameEditSession(_ctx._KDB);
    return true;
  }

  function handleCancelEditSession(_ctx) {
    _bindTabRenameEditSession.cleanupTabRenameEditSession(_ctx._KDB);
    _syncTabsKdbControlReadView(_ctx._KDB);
    return true;
  }

  async function renameTab(_ctx, payload) {
    try {
      const byIndex = _ctx.getRawState().byIndex || {};
      const target = byIndex[String(payload.tabIndex)] || {};
      const previousName = target.name;
      const titleId = target.pageId || payload.pageId || payload.tabId;
      const confirmedName = await _ctx.adapter.setTabName({ pageId: titleId }, payload.name);
      const resolvedName = confirmedName || payload.name;
      _ctx.dispatch({ type: _actionTypes.RENAME, payload: Object.assign({}, payload, { pageId: titleId, phase: "confirmed", confirmedName: resolvedName, errorCode: null, errorMessage: null }) });
      _pushTabsRenameHistoryStep(_ctx._KDB, payload, previousName, resolvedName);
      if (payload.isHistoryReplay !== true) {
        _bindTabRenameEditSession.cleanupTabRenameEditSession(_ctx._KDB);
      }
      _syncTabsDomFromState(_ctx._KDB, _ctx.getRawState());
      _syncTabsKdbControlReadView(_ctx._KDB);
      return true;
    } catch (err) {
      console.error("[tabs.renameTab] rename failed", err);
      _ctx.dispatch({ type: _actionTypes.RENAME, payload: Object.assign({}, payload, { phase: "failed", errorCode: "TABS_RENAME_FAILED", errorMessage: toErrorMessage(err) }) });
      if (payload.isHistoryReplay !== true) {
        _bindTabRenameEditSession.cleanupTabRenameEditSession(_ctx._KDB);
      }
      _syncTabsKdbControlReadView(_ctx._KDB);
      return false;
    }
  }

  function toErrorMessage(err) { return err && err.message ? err.message : String(err || "Unknown tabs error."); }
  function normalizeLineIndex(value) { return typeof value === "number" && value >= 0 && value <= 4 && value === Math.floor(value) ? value : null; }
  function isRenamableUserTab(tab) { return isVisibleUserTab(tab) && !!tab.tabId; }
  function isVisibleUserTab(tab) { return !!tab && tab.visible === true && isDashboardTab(tab); }
  function isDashboardTab(tab) { return !!tab && tab.role === "dashboard"; }

  return applyTabsRenameEffects;
});

define([
  "../config/actionTypes.js",
  "../history.js",
  "../slots.js",
  "../view.js",
  "./session.js"
], function (_actionTypes, _history, _slots, _view, _session) {
  "use strict";

  // Rename target resolution and the effects of the rename family of actions:
  // confirming a rename in Cognos, starting or ending the edit session.

  // The pending rename payload for a rename request, or null when there is no name or no renamable target.
  function buildPendingRename(_KDB, action) {
    const payload = action.payload || {};
    const name = normalizeName(payload.name);
    const target = resolveRenameTarget(_KDB.state.tabs, payload);
    if (!name || !target) { return null; }
    return {
      phase: "pending",
      source: payload.source || "api",
      tabIndex: target.index,
      tabId: target.tabId,
      name: name,
      confirmedName: null,
      errorCode: null,
      errorMessage: null,
      preserveEditSession: payload.preserveEditSession === true,
      isHistoryReplay: payload.isHistoryReplay === true
    };
  }

  function resolveRenameTarget(state, payload) {
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const editUi = state && state.editUi ? state.editUi : {};
    const explicitIndex = Object.prototype.hasOwnProperty.call(payload, "tabIndex") ? payload.tabIndex : null;
    const explicitTab = typeof explicitIndex === "number" ? byIndex[String(explicitIndex)] : null;
    const tabById = payload.tabId ? _slots.findTabById(byIndex, payload.tabId) : null;
    if (payload.isHistoryReplay === true || payload.source === "historyReplay") {
      return firstRenamable([explicitTab, tabById]);
    }
    if (payload.source === "tabEditUi" && _slots.isRenamableUserTab(explicitTab)) { return explicitTab; }
    const sessionTab = typeof editUi.sessionTabIndex === "number" ? byIndex[String(editUi.sessionTabIndex)] : null;
    return firstRenamable([sessionTab, explicitTab, tabById, byIndex[String(state && state.activeIndex)]]);
  }

  function firstRenamable(candidates) {
    return candidates.find(_slots.isRenamableUserTab) || null;
  }

  function normalizeName(value) {
    const name = value == null ? "" : String(value).trim();
    return name || null;
  }

  async function applyRenameEffects(_ctx, action) {
    if (action.type === _actionTypes.RENAME) { return renameTab(_ctx, action.payload || {}); }
    if (action.type === _actionTypes.SELECT_EDIT_TARGET) { return handleSelectEditTarget(_ctx, action.payload || {}); }
    if (action.type === _actionTypes.CANCEL_EDIT_SESSION) { return handleCancelEditSession(_ctx); }
    return true;
  }

  function handleSelectEditTarget(_ctx, payload) {
    const tabIndex = normalizeLineIndex(payload.tabIndex);
    _view.syncKdbControlView(_ctx._KDB);
    const tab = _ctx.getRawState().byIndex && _ctx.getRawState().byIndex[String(tabIndex)];
    if (tabIndex != null && _slots.isRenamableUserTab(tab)) {
      if (_session.startEditSession(_ctx)) { return true; }
      _ctx.dispatch({ type: _actionTypes.CANCEL_EDIT_SESSION, payload: { source: "tabEditUi" } });
      return false;
    }
    _session.commitOutgoingEditSession(_ctx);
    _session.cleanupEditSession(_ctx._KDB);
    return true;
  }

  function handleCancelEditSession(_ctx) {
    _session.cleanupEditSession(_ctx._KDB);
    _view.syncKdbControlView(_ctx._KDB);
    return true;
  }

  async function renameTab(_ctx, payload) {
    const target = (_ctx.getRawState().byIndex || {})[String(payload.tabIndex)] || {};
    const previousName = target.name;
    const titleId = target.pageId || payload.pageId || payload.tabId;
    try {
      const confirmedName = await _ctx.adapter.setTabName({ pageId: titleId }, payload.name);
      const resolvedName = confirmedName || payload.name;
      _ctx.dispatch({
        type: _actionTypes.RENAME,
        payload: Object.assign({}, payload, { pageId: titleId, phase: "confirmed", confirmedName: resolvedName, errorCode: null, errorMessage: null })
      });
      _history.pushRenameHistoryStep(_ctx._KDB, payload, previousName, resolvedName);
      if (payload.isHistoryReplay !== true) { _session.cleanupEditSession(_ctx._KDB); }
      _view.syncDomFromState(_ctx._KDB, _ctx.getRawState());
      _view.syncKdbControlView(_ctx._KDB);
      return true;
    } catch (err) {
      console.error("[tabs.renameTab] rename failed", err);
      const errorMessage = err && err.message ? err.message : String(err || "Unknown tabs error.");
      _ctx.dispatch({
        type: _actionTypes.RENAME,
        payload: Object.assign({}, payload, { phase: "failed", errorCode: "TABS_RENAME_FAILED", errorMessage: errorMessage })
      });
      if (payload.isHistoryReplay !== true) { _session.cleanupEditSession(_ctx._KDB); }
      _view.syncKdbControlView(_ctx._KDB);
      return false;
    }
  }

  function normalizeLineIndex(value) {
    return typeof value === "number" && value >= 0 && value <= 4 && value === Math.floor(value) ? value : null;
  }

  return { buildPendingRename: buildPendingRename, applyRenameEffects: applyRenameEffects };
});

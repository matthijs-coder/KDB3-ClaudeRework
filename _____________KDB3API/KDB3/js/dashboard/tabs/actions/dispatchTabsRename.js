define(["../config/actionTypes.js", "../effects/applyTabsEffects.js", "./commitTabsState.js", "../slots.js"], function (_actionTypes, _applyTabsEffects, _commitTabsState, _slots) {
  "use strict";

  function dispatchTabsRename(instance, action) {
    try {
      const payload = action.payload || {};
      const name = normalizeName(payload.name);
      const target = resolveRenameTarget(instance._KDB.state.tabs, payload);
      if (!name || !target) { return false; }
      const pending = {
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
      _commitTabsState(instance, { type: _actionTypes.RENAME, payload: pending });
      return _applyTabsEffects(buildEffectContext(instance), { type: _actionTypes.RENAME, payload: pending });
    } catch (err) {
      console.error("[tabs.dispatchRename] rename dispatch failed", err);
      _commitTabsState(instance, buildErrorAction(err));
      return false;
    }
  }

  function resolveRenameTarget(state, payload) {
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const editUi = state && state.editUi ? state.editUi : {};
    const source = payload || {};
    const explicitIndex = Object.prototype.hasOwnProperty.call(source, "tabIndex") ? source.tabIndex : null;
    if (source.isHistoryReplay === true || source.source === "historyReplay") {
      return resolveReplayRenameTarget(byIndex, source, explicitIndex);
    }
    if (source.source === "tabEditUi" && typeof explicitIndex === "number" && _slots.isRenamableUserTab(byIndex[String(explicitIndex)])) {
      return byIndex[String(explicitIndex)];
    }
    if (typeof editUi.sessionTabIndex === "number" && _slots.isRenamableUserTab(byIndex[String(editUi.sessionTabIndex)])) {
      return byIndex[String(editUi.sessionTabIndex)];
    }
    if (typeof explicitIndex === "number" && _slots.isRenamableUserTab(byIndex[String(explicitIndex)])) { return byIndex[String(explicitIndex)]; }
    if (source.tabId && _slots.isRenamableUserTab(_slots.findTabById(byIndex, source.tabId))) { return _slots.findTabById(byIndex, source.tabId); }
    return _slots.isRenamableUserTab(byIndex[String(state && state.activeIndex)]) ? byIndex[String(state.activeIndex)] : null;
  }

  function resolveReplayRenameTarget(byIndex, source, explicitIndex) {
    if (typeof explicitIndex === "number" && _slots.isRenamableUserTab(byIndex[String(explicitIndex)])) { return byIndex[String(explicitIndex)]; }
    if (source.tabId && _slots.isRenamableUserTab(_slots.findTabById(byIndex, source.tabId))) { return _slots.findTabById(byIndex, source.tabId); }
    return null;
  }

  function buildEffectContext(instance) { return { _KDB: instance._KDB, adapter: instance.adapter, dispatch: instance.dispatch, getRawState: getRawState.bind(null, instance), getState: instance.getState, isDisposed: isDisposed.bind(null, instance) }; }
  function getRawState(instance) { return instance._KDB.state.tabs; }
  function normalizeName(value) { const name = value == null ? "" : String(value).trim(); return name || null; }
  function isDisposed(instance) { return instance.isDisposed === true; }
  function buildErrorAction(err) { return { type: _actionTypes.ERROR, payload: { errorCode: "TABS_ERROR", errorMessage: err && err.message ? err.message : String(err || "Unknown tabs error.") } }; }

  return dispatchTabsRename;
});

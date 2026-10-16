define(["../config/actionTypes.js", "../config/defaults.js", "../effects/applyTabsEffects.js", "./commitTabsState.js"], function (_actionTypes, _defaults, _applyTabsEffects, _commitTabsState) {
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
    if (source.source === "tabEditUi" && typeof explicitIndex === "number" && isRenamableUserTab(byIndex[String(explicitIndex)])) {
      return byIndex[String(explicitIndex)];
    }
    if (typeof editUi.sessionTabIndex === "number" && isRenamableUserTab(byIndex[String(editUi.sessionTabIndex)])) {
      return byIndex[String(editUi.sessionTabIndex)];
    }
    if (typeof explicitIndex === "number" && isRenamableUserTab(byIndex[String(explicitIndex)])) { return byIndex[String(explicitIndex)]; }
    if (source.tabId && isRenamableUserTab(findTabById(byIndex, source.tabId))) { return findTabById(byIndex, source.tabId); }
    return isRenamableUserTab(byIndex[String(state && state.activeIndex)]) ? byIndex[String(state.activeIndex)] : null;
  }

  function resolveReplayRenameTarget(byIndex, source, explicitIndex) {
    if (typeof explicitIndex === "number" && isRenamableUserTab(byIndex[String(explicitIndex)])) { return byIndex[String(explicitIndex)]; }
    if (source.tabId && isRenamableUserTab(findTabById(byIndex, source.tabId))) { return findTabById(byIndex, source.tabId); }
    return null;
  }

  function findTabById(byIndex, tabId) { const keys = Object.keys(byIndex || {}); let index = 0; while (index < keys.length) { const tab = byIndex[keys[index]]; if (tab && tab.tabId === tabId) { return tab; } index += 1; } return null; }
  function buildEffectContext(instance) { return { _KDB: instance._KDB, adapter: instance.adapter, dispatch: instance.dispatch, getRawState: getRawState.bind(null, instance), getState: instance.getState, isDisposed: isDisposed.bind(null, instance) }; }
  function getRawState(instance) { return instance._KDB.state.tabs; }
  function isDashboardTab(tab) {
    if (!tab) { return false; }
    if (tab.role) { return tab.role === "dashboard"; }
    return tab.isHelper !== true && tab.index < _defaults.MAX_USER_TABS;
  }
  function isVisibleUserTab(tab) { return !!tab && tab.visible === true && isDashboardTab(tab); }
  function isRenamableUserTab(tab) { return isVisibleUserTab(tab) && !!tab.tabId; }
  function normalizeName(value) { const name = value == null ? "" : String(value).trim(); return name || null; }
  function isDisposed(instance) { return instance.isDisposed === true; }
  function buildErrorAction(err) { return { type: _actionTypes.ERROR, payload: { errorCode: "TABS_ERROR", errorMessage: err && err.message ? err.message : String(err || "Unknown tabs error.") } }; }

  return dispatchTabsRename;
});

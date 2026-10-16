define(["../config/actionTypes.js", "../config/defaults.js", "../effects/applyTabsEffects.js", "./routeParameterSetAction.js", "./routeTabMutationAction.js", "./commitTabsState.js", "./dispatchTabsTraverse.js", "./dispatchTabsRename.js"], function (_actionTypes, _defaults, _applyTabsEffects, _routeParameterSetAction, _routeTabMutationAction, _commitTabsState, _dispatchTabsTraverse, _dispatchTabsRename) {
  "use strict";

  function dispatchTabsAction(instance, _action) {
    try {
      const action = _action || {};
      if (instance.isDisposed && _routeParameterSetAction.isParameterSetAction(action.type)) { warnDisposed(instance, "dispatch"); return _routeParameterSetAction.disposedResult(action.type, action.payload); }
      if (instance.isDisposed && _routeTabMutationAction.isTabMutationAction(action.type)) { warnDisposed(instance, "dispatch"); return _routeTabMutationAction.disposedResult(); }
      if (instance.isDisposed && action.type !== _actionTypes.DESTROY) { warnDisposed(instance, "dispatch"); return action.type === _actionTypes.TRAVERSE ? Promise.resolve(false) : false; }
      if (_routeParameterSetAction.isParameterSetAction(action.type)) { return _routeParameterSetAction(buildEffectContext(instance), action); }
      if (_routeTabMutationAction.isTabMutationAction(action.type)) { return _routeTabMutationAction(buildEffectContext(instance), action); }
      if (action.type === _actionTypes.TRAVERSE && isTraverseEffectResult(action.payload)) { return _commitTabsState(instance, action); }
      if (action.type === _actionTypes.TRAVERSE) { return _dispatchTabsTraverse(instance, action.payload || {}); }
      if (isDeferredAction(action.type)) { return false; }
      if (action.type === _actionTypes.RENAME && isRenameEffectResult(action.payload)) { return _commitTabsState(instance, action); }
      if (action.type === _actionTypes.RENAME) { return _dispatchTabsRename(instance, action); }
      if (action.type === _actionTypes.ADD && !hasHiddenUserTab(instance._KDB.state.tabs)) { _commitTabsState(instance, action); return false; }
      if (action.type === _actionTypes.SELECT_TOOL && !isAllowedTool(action.payload)) { return false; }
      if (action.type === _actionTypes.SELECT_EDIT_TARGET || action.type === _actionTypes.CANCEL_EDIT_SESSION) {
        const didEditCommit = _commitTabsState(instance, action);
        if (didEditCommit) { _applyTabsEffects(buildEffectContext(instance), action); }
        return didEditCommit;
      }
      const didCommit = _commitTabsState(instance, action);
      if (didCommit && shouldRunEffects(action.type)) { _applyTabsEffects(buildEffectContext(instance), action); }
      return didCommit;
    } catch (err) {
      console.error("[tabs.dispatch] dispatch boundary failed", err);
      _commitTabsState(instance, buildErrorAction(err));
      return false;
    }
  }

  function hasHiddenUserTab(state) {
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const order = Array.isArray(state && state.order) ? state.order : [];
    return order.some(function (index) { const tab = byIndex[String(index)]; return isDashboardTab(tab) && tab.visible !== true; });
  }

  function isDeferredAction(type) { return type === _actionTypes.REORDER; }
  function isRenameEffectResult(payload) { return !!payload && (payload.phase === "confirmed" || payload.phase === "failed"); }
  function isTraverseEffectResult(payload) { return !!payload && (payload.phase === "pending" || payload.phase === "confirmed" || payload.phase === "failed"); }
  function shouldRunEffects(type) { return type === _actionTypes.ADD || type === _actionTypes.AUTHORING_ENTERED || type === _actionTypes.AUTHORING_EXITED; }
  function isAllowedTool(payload) { return payload && payload.tool === "rename"; }
  function isDashboardTab(tab) {
    if (!tab) { return false; }
    if (tab.role) { return tab.role === "dashboard"; }
    return tab.isHelper !== true && tab.index < _defaults.MAX_USER_TABS;
  }
  function buildEffectContext(instance) { return { _KDB: instance._KDB, adapter: instance.adapter, dispatch: instance.dispatch, getRawState: getRawState.bind(null, instance), getState: instance.getState, isDisposed: isDisposed.bind(null, instance) }; }
  function getRawState(instance) { return instance._KDB.state.tabs; }
  function isDisposed(instance) { return instance.isDisposed === true; }
  function warnDisposed(instance, methodName) { if (methodName === "mount" && !instance.didWarnDisposedMount) { console.warn("[tabs.mount] called after destroy; obtain a fresh instance from the factory"); instance.didWarnDisposedMount = true; } if (methodName === "dispatch" && !instance.didWarnDisposedDispatch) { console.warn("[tabs.dispatch] called after destroy"); instance.didWarnDisposedDispatch = true; } }
  function buildErrorAction(err) { return { type: _actionTypes.ERROR, payload: { errorCode: "TABS_ERROR", errorMessage: err && err.message ? err.message : String(err || "Unknown tabs error.") } }; }

  return dispatchTabsAction;
});

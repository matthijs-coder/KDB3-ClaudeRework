define([
  "../config/actionTypes.js",
  "./parameterSetRestore.js",
  "./parameterSetReset.js",
  "./parameterSetActivateTab.js",
  "./postParameterSetRestoreTraverse.js",
  "./resolveFilterScopeTargets.js",
  "./parameterSetAbortLanding.js",
  "./writebackGetPersistLanding.js",
], function (_actionTypes, _parameterSetRestore, _parameterSetReset, _parameterSetActivateTab, _postParameterSetRestoreTraverse, _resolveFilterScopeTargets, _parameterSetAbortLanding, _writebackGetPersistLanding) {
  "use strict";

  // Routing facade for the public tabs parameterSet* dispatch surface, so
  // createTabsController only needs two routing lines. All handlers return
  // Promise<{ ok, ..., diagnostics }> per the tabs parameterSet delta.
  function routeParameterSetAction(_ctx, _action) {
    const action = _action || {};
    const payload = action.payload || {};
    if (action.type === _actionTypes.PARAMETER_SET_RESTORE) { return _parameterSetRestore(_ctx, payload); }
    if (action.type === _actionTypes.PARAMETER_SET_RESET) { return _parameterSetReset(_ctx, payload); }
    if (action.type === _actionTypes.PARAMETER_SET_ACTIVATE_TAB) { return _parameterSetActivateTab(_ctx, payload); }
    if (action.type === _actionTypes.PARAMETER_SET_ABORT_LANDING) { return _parameterSetAbortLanding(_ctx, payload); }
    if (action.type === _actionTypes.RESOLVE_FILTER_SCOPE_TARGETS) { return _resolveFilterScopeTargets(_ctx, payload); }
    if (action.type === _actionTypes.WRITEBACK_GET_PERSIST_LANDING) { return _writebackGetPersistLanding(_ctx, payload); }
    if (action.type === _actionTypes.POST_PARAMETER_SET_RESTORE_TRAVERSE) { return _postParameterSetRestoreTraverse(_ctx, payload); }
    return Promise.resolve({
      ok: false,
      diagnostics: [{ code: "TABS_PARAMETER_SET_UNKNOWN_ACTION", message: "unknown tabs parameterSet action type" }]
    });
  }

  routeParameterSetAction.isParameterSetAction = function (type) {
    return type === _actionTypes.PARAMETER_SET_RESTORE ||
      type === _actionTypes.PARAMETER_SET_RESET ||
      type === _actionTypes.PARAMETER_SET_ACTIVATE_TAB ||
      type === _actionTypes.PARAMETER_SET_ABORT_LANDING ||
      type === _actionTypes.RESOLVE_FILTER_SCOPE_TARGETS ||
      type === _actionTypes.POST_PARAMETER_SET_RESTORE_TRAVERSE ||
      type === _actionTypes.WRITEBACK_GET_PERSIST_LANDING;
  };

  // Honest structured acknowledgement after destroy (delta §7): writebackSet
  // must see ok:false instead of an unacknowledged dispatch.
  routeParameterSetAction.disposedResult = function (type, payload) {
    if (type === _actionTypes.RESOLVE_FILTER_SCOPE_TARGETS) {
      return _resolveFilterScopeTargets.disposedResult(payload);
    }
    return Promise.resolve({
      ok: false,
      diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "tabs controller is disposed" }]
    });
  };

  return routeParameterSetAction;
});

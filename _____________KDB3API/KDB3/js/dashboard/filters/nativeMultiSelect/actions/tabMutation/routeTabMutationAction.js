define([
  "../../config/actions.js",
  "./prepareTabMutation.js",
  "./applyTabMutation.js",
  "./restoreTabMutationSnapshot.js",
  "./resyncTabMutationHost.js"
], function (_actions, _prepareTabMutation, _applyTabMutation, _restoreTabMutationSnapshot, _resyncTabMutationHost) {
  "use strict";

  function routeTabMutationAction(_ctx, _action) {
    var action = _action || {};
    var payload = action.payload || {};
    if (action.type === _actions.PREPARE_TAB_MUTATION) {
      return _prepareTabMutation(_ctx, payload);
    }
    if (action.type === _actions.APPLY_TAB_MUTATION) {
      return _applyTabMutation(_ctx, payload);
    }
    if (action.type === _actions.RESYNC_TAB_MUTATION_HOST) {
      return _resyncTabMutationHost(_ctx, payload);
    }
    return _restoreTabMutationSnapshot(_ctx, payload);
  }

  routeTabMutationAction.isTabMutationAction = function (type) {
    return type === _actions.PREPARE_TAB_MUTATION ||
      type === _actions.APPLY_TAB_MUTATION ||
      type === _actions.RESTORE_TAB_MUTATION_SNAPSHOT ||
      type === _actions.RESYNC_TAB_MUTATION_HOST;
  };

  routeTabMutationAction.disposedResult = function (_payload) {
    var payload = _payload || {};
    return Promise.resolve({
      ok: false,
      operationId: payload.operationId || null,
      diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "NativeMultiSelect controller is disposed" }]
    });
  };

  return routeTabMutationAction;
});

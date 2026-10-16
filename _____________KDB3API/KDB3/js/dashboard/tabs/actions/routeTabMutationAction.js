define([
  "../config/actionTypes.js",
  "../config/mutationCodes.js",
  "./tabMutationDelete.js",
  "./tabMutationMove.js",
  "./tabMutationDuplicate.js",
  "./tabMutationRestoreDeleted.js"
], function (_actionTypes, _codes, _tabMutationDelete, _tabMutationMove, _tabMutationDuplicate, _tabMutationRestoreDeleted) {
  "use strict";

  function routeTabMutationAction(_ctx, _action) {
    var action = _action || {};
    if (action.type === _actionTypes.DELETE) {
      return _tabMutationDelete(_ctx, action);
    }
    if (action.type === _actionTypes.MOVE) {
      return _tabMutationMove(_ctx, action);
    }
    if (action.type === _actionTypes.DUPLICATE) {
      return _tabMutationDuplicate(_ctx, action);
    }
    if (action.type === _actionTypes.RESTORE_DELETED) {
      return _tabMutationRestoreDeleted(_ctx, action);
    }
    return Promise.resolve({ ok: false, diagnostics: [{ code: _codes.APPLY_FAILED, message: "Unsupported tabs mutation action." }] });
  }

  routeTabMutationAction.isTabMutationAction = function (type) {
    return type === _actionTypes.DELETE || type === _actionTypes.MOVE || type === _actionTypes.DUPLICATE || type === _actionTypes.RESTORE_DELETED;
  };

  routeTabMutationAction.disposedResult = function () {
    return Promise.resolve({ ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "tabs controller is disposed" }] });
  };

  return routeTabMutationAction;
});

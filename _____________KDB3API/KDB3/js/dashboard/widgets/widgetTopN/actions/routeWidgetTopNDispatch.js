define([
  "../config/actionTypes.js",
  "../actions/validateOwnerVisId.js",
  "./handleResolveRequested.js",
  "./handleCleanup.js"
], function (_actionTypes, _validateOwnerVisId, _handleResolveRequested, _handleCleanup) {
  "use strict";

  function validateAction(_action) {
    var action = _action || {};
    if (!action.type) {
      return { errorCode: "WIDGET_TOPN_INVALID_REQUEST", errorMessage: "Missing widgetTopN action type." };
    }
    if (_validateOwnerVisId.hasOwnerIdConflict(action)) {
      return { errorCode: "WIDGET_TOPN_OWNER_ID_CONFLICT" };
    }
    return action;
  }

  function routeAction(_context, _action) {
    if (_action.errorCode) {
      return Promise.resolve({ ok: false, status: "error", errorCode: _action.errorCode, errorMessage: _action.errorMessage });
    }
    if (_action.type === _actionTypes.RESOLVE_REQUESTED) {
      return Promise.resolve(_handleResolveRequested(_context, _action));
    }
    if (_action.type === _actionTypes.CLEANUP) {
      return Promise.resolve(_handleCleanup(_context, _action));
    }
    if (_action.type === _actionTypes.ERROR) {
      return Promise.resolve(handleError(_context, _action));
    }
    return Promise.resolve({ ok: false, status: "error", errorCode: "WIDGET_TOPN_INVALID_REQUEST", errorMessage: "Unknown widgetTopN action." });
  }

  function handleError(_context, _action) {
    _context.dispatchInternal({
      type: _actionTypes.ERROR_RECORDED,
      widgetId: _action.widgetId,
      payload: _action.payload || {}
    });
    return { ok: true, ownerVisId: _action.widgetId, status: "error" };
  }

  return {
    validateAction: validateAction,
    routeAction: routeAction
  };
});

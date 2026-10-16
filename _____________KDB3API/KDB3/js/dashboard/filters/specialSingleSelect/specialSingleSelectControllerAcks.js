define([
  "./config/actions.js"
], function (_actions) {
  "use strict";

  function buildDisposedAck(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var message = "specialSingleSelect controller is disposed";
    return {
      ok: false,
      acknowledged: false,
      degraded: true,
      disposed: true,
      errorCode: "SPECIAL_SINGLE_SELECT_DISPOSED",
      errorMessage: message,
      actionType: _action && _action.type,
      inventoryGeneration: payload.inventoryGeneration,
      diagnostics: [{
        code: "SPECIAL_SINGLE_SELECT_DISPOSED",
        message: message
      }]
    };
  }

  function isAckAction(_actionType) {
    return _actionType === _actions.USER_SELECTION_COMMITTED ||
      _actionType === _actions.SINGLE_SELECT_INVENTORY_RECONCILED ||
      _actionType === _actions.SYNC_REQUESTED;
  }

  function buildDispatchFailureAck(_action, _error) {
    var payload = _action && _action.payload ? _action.payload : {};
    var message = String(_error && _error.message ? _error.message : _error);
    return {
      ok: false,
      acknowledged: false,
      degraded: true,
      disposed: false,
      errorCode: "SPECIAL_SINGLE_SELECT_DISPATCH_FAILED",
      errorMessage: message,
      actionType: _action && _action.type,
      inventoryGeneration: payload.inventoryGeneration,
      diagnostics: [{
        code: "SPECIAL_SINGLE_SELECT_DISPATCH_FAILED",
        message: message
      }]
    };
  }

  return {
    buildDisposedAck: buildDisposedAck,
    isAckAction: isAckAction,
    buildDispatchFailureAck: buildDispatchFailureAck
  };
});

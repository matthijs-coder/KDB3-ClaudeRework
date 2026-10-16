define(["../config/actions.js", "./initialState.js"], function (_actions, _initialState) {
  "use strict";

  function createSingleSelectReducer() {
    return reduceSingleSelectState;
  }

  function reduceSingleSelectState(_state, _action) {
    var state = _state || _initialState();
    var action = _action || {};
    var payload = action.payload || {};

    if (action.type === _actions.MOUNT_SUCCEEDED) {
      return Object.assign({}, state, {
        lifecycle: "ready",
        errorCode: null,
        errorMessage: null
      });
    }
    if (action.type === _actions.ERROR) {
      return Object.assign({}, state, {
        lifecycle: "error",
        errorCode: payload.errorCode || "SINGLE_SELECT_ERROR",
        errorMessage: payload.errorMessage || null
      });
    }
    if (action.type === _actions.DESTROY) {
      return Object.assign({}, state, {
        lifecycle: "disposed",
        lastInteraction: null,
        instancesById: Object.assign({}, state.instancesById || {})
      });
    }
    return state;
  }

  return createSingleSelectReducer;
});

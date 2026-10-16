define(["../config.js", "./initialState.js"], function (_config, _initialState) {
  "use strict";

  function createSingleSelectReducer() {
    return reduceSingleSelectState;
  }

  function reduceSingleSelectState(_state, _action) {
    var state = _state || _initialState();
    var action = _action || {};
    var payload = action.payload || {};

    if (action.type === _config.actions.MOUNT_SUCCEEDED) {
      return Object.assign({}, state, {
        lifecycle: "ready",
        errorCode: null,
        errorMessage: null
      });
    }
    if (action.type === _config.actions.ERROR) {
      return Object.assign({}, state, {
        lifecycle: "error",
        errorCode: payload.errorCode || "SINGLE_SELECT_ERROR",
        errorMessage: payload.errorMessage || null
      });
    }
    if (action.type === _config.actions.DESTROY) {
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

define(["../config.js"], function (_config) {
  "use strict";

  function initialState() {
    return {
      lifecycle: "idle",
      inventory: {
        generation: 0,
        freshness: "stale",
        reconcileInFlight: false,
        reconciledAt: null,
        errorCode: null
      },
      instancesById: {},
      meta: { isProgrammaticClick: false },
      lastInteraction: null,
      lastConfirmedAt: null,
      lastDiagnostics: [],
      errorCode: null,
      errorMessage: null
    };
  }

  function reduceSingleSelectState(_state, _action) {
    var state = _state || initialState();
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
        lastInteraction: null
      });
    }
    return state;
  }

  function createSingleSelectReducer() {
    return reduceSingleSelectState;
  }

  return {
    initialState: initialState,
    createSingleSelectReducer: createSingleSelectReducer
  };
});

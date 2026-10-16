define(["./config.js"], function (_config) {
  "use strict";
  // Lifecycle terms: idle, initializing, ready, error, disposed.
  const ACTION_TYPES = _config.ACTION_TYPES;

  function createInitialLaunchpadState() {
    return {
      lifecycle: "idle",
      domReady: false,
      helperTabPageId: null,
      helperTabIds: [],
      padsByKey: {},
      tabs: [],
      errorCode: null,
      errorMessage: null
    };
  }

  function reduceLaunchpadState(_state, _action) {
    const action = _action || {};
    const state = normalizeState(_state);
    switch (action.type) {
      case ACTION_TYPES.MOUNT_STARTED: return reduceMountStarted(state);
      case ACTION_TYPES.MOUNT_SUCCEEDED: return reduceMountSucceeded(action.payload);
      case ACTION_TYPES.MOUNT_FAILED: return reduceMountFailed(state, action.payload);
      case ACTION_TYPES.DESTROY: return reduceDestroy();
      default: return state;
    }
  }

  function normalizeState(_state) {
    const state = _state || {};
    return {
      lifecycle: state.lifecycle || "idle",
      domReady: state.domReady === true,
      helperTabPageId: state.helperTabPageId || null,
      helperTabIds: copyArray(state.helperTabIds),
      padsByKey: copyPadsByKey(state.padsByKey),
      tabs: copyArray(state.tabs),
      errorCode: state.errorCode || null,
      errorMessage: state.errorMessage || null
    };
  }

  function reduceMountStarted(state) {
    return Object.assign({}, state, { lifecycle: "initializing", domReady: false, errorCode: null, errorMessage: null });
  }

  function reduceMountSucceeded(_payload) {
    const payload = _payload || {};
    return {
      lifecycle: "ready",
      domReady: true,
      helperTabPageId: payload.helperTabPageId || null,
      helperTabIds: copyArray(payload.helperTabIds),
      padsByKey: copyPadsByKey(payload.padsByKey),
      tabs: copyArray(payload.tabs),
      errorCode: null,
      errorMessage: null
    };
  }

  function reduceMountFailed(state, _payload) {
    const payload = _payload || {};
    return Object.assign({}, state, {
      lifecycle: "error",
      domReady: false,
      errorCode: payload.errorCode || "LAUNCHPAD_MOUNT_FAILED",
      errorMessage: payload.errorMessage || "Launchpad mount failed."
    });
  }

  function reduceDestroy() {
    return Object.assign(createInitialLaunchpadState(), { lifecycle: "disposed" });
  }

  function copyArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function copyPadsByKey(_padsByKey) {
    const padsByKey = _padsByKey || {};
    const copy = {};
    Object.keys(padsByKey).forEach(function (padKey) {
      copy[padKey] = copyArray(padsByKey[padKey]);
    });
    return copy;
  }

  return {
    createInitialLaunchpadState: createInitialLaunchpadState,
    reduceLaunchpadState: reduceLaunchpadState
  };
});

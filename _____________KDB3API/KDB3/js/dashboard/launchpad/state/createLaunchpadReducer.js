define([], function () {
  function createLaunchpadReducer() {
    return reduceLaunchpadState;
  }
  function reduceLaunchpadState(_state, _action) {
    const action = _action || {};
    const state = normalizeState(_state);
    if (action.type === "launchpad/mountStarted") { return reduceMountStarted(state); }
    if (action.type === "launchpad/mountSucceeded") { return reduceMountSucceeded(action.payload); }
    if (action.type === "launchpad/mountFailed") { return reduceMountFailed(state, action.payload); }
    if (action.type === "launchpad/destroy") { return reduceDestroy(); }
    return state;
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
    return {
      lifecycle: "initializing",
      domReady: false,
      helperTabPageId: state.helperTabPageId,
      helperTabIds: state.helperTabIds,
      padsByKey: state.padsByKey,
      tabs: state.tabs,
      errorCode: null,
      errorMessage: null
    };
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
    return {
      lifecycle: "error",
      domReady: false,
      helperTabPageId: state.helperTabPageId,
      helperTabIds: state.helperTabIds,
      padsByKey: state.padsByKey,
      tabs: state.tabs,
      errorCode: payload.errorCode || "LAUNCHPAD_MOUNT_FAILED",
      errorMessage: payload.errorMessage || "Launchpad mount failed."
    };
  }
  function reduceDestroy() {
    return { lifecycle: "disposed", domReady: false, helperTabPageId: null, helperTabIds: [], padsByKey: {}, tabs: [], errorCode: null, errorMessage: null };
  }
  function copyArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }
  function copyPadsByKey(_padsByKey) {
    const padsByKey = _padsByKey || {};
    const copy = {};
    const keys = Object.keys(padsByKey);
    let index = 0;
    while (index < keys.length) {
      copy[keys[index]] = copyArray(padsByKey[keys[index]]);
      index += 1;
    }
    return copy;
  }
  return createLaunchpadReducer;
});

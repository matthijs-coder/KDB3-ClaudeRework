define(["./state/createLaunchpadReducer.js", "./state/selectors.js", "./state/buildLaunchpadTabDescriptors.js", "./view/buildLaunchpadDom.js", "./view/placeLaunchpadDom.js", "./view/removeLaunchpadDom.js", "./clearLaunchpadRuntime.js", "./effects/readSlotWidgets.js"], function (_createLaunchpadReducer, _selectors, _buildLaunchpadTabDescriptors, _buildLaunchpadDom, _placeLaunchpadDom, _removeLaunchpadDom, _clearLaunchpadRuntime, _readSlotWidgets) {
  const WAIT_UNTIL_READY = "launchpad/waitUntilReady";
  const READ_SLOT_WIDGETS = "launchpad/readSlotWidgets";
  function createLaunchpadController(_deps) {
    const instance = { _KDB: _deps._KDB, options: _deps.options || {}, reducer: _createLaunchpadReducer(), isDisposed: false, didWarnDisposedMount: false, didWarnDisposedDispatch: false };
    ensureRuntime(instance._KDB);
    return { mount: mount.bind(null, instance), destroy: destroy.bind(null, instance), dispatch: dispatch.bind(null, instance), getState: getState.bind(null, instance) };
  }
  function mount(instance, _options) {
    const runtime = ensureRuntime(instance._KDB);
    const options = Object.assign({}, instance.options, _options || {});
    if (instance.isDisposed) { warnDisposed(instance, "mount"); return Promise.resolve(false); }
    if (isMountedAndReady(instance._KDB)) {
      return Promise.resolve(true);
    }
    if (runtime.pendingPromises.mount) { return runtime.pendingPromises.mount; }
    try {
      clearPendingMount(runtime);
      dispatchState(instance, { type: "launchpad/mountStarted" });
      runtime.pendingPromises.mount = runMountPipeline(instance, options);
      return runtime.pendingPromises.mount;
    } catch (err) {
      dispatchState(instance, buildMountFailedAction(err));
      clearPendingMount(runtime);
      console.error("[launchpad.mount] mount boundary failed", err);
      return Promise.resolve(false);
    }
  }
  async function runMountPipeline(instance, options) {
    const runtime = ensureRuntime(instance._KDB);
    try {
      const descriptorModel = _buildLaunchpadTabDescriptors(instance._KDB, options);
      const buildResult = _buildLaunchpadDom(instance._KDB, descriptorModel, options);
      validateBuildResult(buildResult);
      if (_placeLaunchpadDom(instance._KDB, buildResult) !== true) { throw new Error("Launchpad DOM placement failed."); }
      dispatchState(instance, buildMountSucceededAction(buildResult));
      return true;
    } catch (err) {
      console.error("[launchpad.runMountPipeline] mount pipeline failed", err);
      dispatchState(instance, buildMountFailedAction(err));
      return false;
    } finally {
      clearPendingMount(runtime);
    }
  }
  function dispatch(instance, _action) {
    const action = _action || {};
    if (instance.isDisposed && action.type !== "launchpad/destroy") { warnDisposed(instance, "dispatch"); return isAsyncDispatch(action.type) ? Promise.resolve(buildDisposedAsyncResult(action)) : undefined; }
    if (action.type === WAIT_UNTIL_READY) { return waitUntilReady(instance, action.payload || {}); }
    if (action.type === READ_SLOT_WIDGETS) { return Promise.resolve(_readSlotWidgets(instance._KDB, action.payload || {})); }
    dispatchState(instance, action);
    return instance._KDB.state.launchpad;
  }
  function isAsyncDispatch(actionType) {
    return actionType === WAIT_UNTIL_READY || actionType === READ_SLOT_WIDGETS;
  }
  function buildDisposedAsyncResult(action) {
    if (action.type === READ_SLOT_WIDGETS) {
      const payload = action.payload || {};
      return { ok: false, errorCode: "LAUNCHPAD_DISPOSED", errorMessage: "Launchpad dispatch called after destroy.", padKey: payload.padKey || null, tabId: payload.tabId != null ? payload.tabId : null, mode: payload.mode === "first" ? "first" : "all", widgets: [], widgetId: null };
    }
    return false;
  }
  function waitUntilReady(instance, _payload) {
    if (instance.isDisposed) { return Promise.resolve(false); }
    if (isMountedAndReady(instance._KDB)) { return Promise.resolve(true); }
    const runtime = ensureRuntime(instance._KDB);
    if (runtime.pendingPromises.waitUntilReady) { return runtime.pendingPromises.waitUntilReady; }
    runtime.pendingPromises.waitUntilReady = runWaitUntilReady(instance).finally(function () { delete runtime.pendingPromises.waitUntilReady; });
    return runtime.pendingPromises.waitUntilReady;
  }
  function runWaitUntilReady(instance) {
    const runtime = ensureRuntime(instance._KDB);
    if (runtime.pendingPromises.mount) {
      return resolveMountReady(instance, runtime.pendingPromises.mount);
    }
    return Promise.resolve(isMountedAndReady(instance._KDB));
  }
  function resolveMountReady(instance, mountPromise) {
    return Promise.resolve(mountPromise).then(function (ok) { return ok === true && isMountedAndReady(instance._KDB); });
  }
  function destroy(instance) {
    const runtime = ensureRuntime(instance._KDB);
    if (instance.isDisposed) { return; }
    instance.isDisposed = true;
    try {
      _removeLaunchpadDom(instance._KDB);
      _clearLaunchpadRuntime(runtime);
      dispatchState(instance, { type: "launchpad/destroy" });
    } catch (err) {
      console.error("[launchpad.destroy] destroy boundary failed", err);
    }
  }
  function getState(instance) {
    if (instance.isDisposed) { return undefined; }
    return _selectors.readLaunchpadState(instance._KDB);
  }
  function dispatchState(instance, _action) { instance._KDB.state.launchpad = instance.reducer(instance._KDB.state.launchpad, _action); }
  function ensureRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.launchpad = _KDB.runtime.launchpad || {};
    const runtime = _KDB.runtime.launchpad;
    runtime.domRefs = runtime.domRefs || {}; runtime.listeners = runtime.listeners || {}; runtime.subscriptions = runtime.subscriptions || {};
    runtime.abortControllers = runtime.abortControllers || {}; runtime.observers = runtime.observers || {}; runtime.timers = runtime.timers || {}; runtime.pendingPromises = runtime.pendingPromises || {};
    return runtime;
  }
  function isMountedAndReady(_KDB) {
    const runtime = ensureRuntime(_KDB);
    const domRefs = runtime.domRefs || {};
    return _selectors.readLaunchpadReady(_KDB) === true && isConnectedElement(domRefs.hideSpotEl) && isConnectedElement(domRefs.rootEl) && hasPadSlots(_selectors.readLaunchpadState(_KDB));
  }
  function isConnectedElement(element) {
    return !!element && (element.isConnected === true || !!element.parentNode);
  }
  function validateBuildResult(buildResult) {
    if (!buildResult || !buildResult.hideSpotEl) { throw new Error("Launchpad hide spot was not built."); }
    if (!Array.isArray(buildResult.tabs) || buildResult.tabs.length === 0) { throw new Error("Launchpad build produced no tab descriptors."); }
    if (!hasPadSlots(buildResult)) { throw new Error("Launchpad build produced no launchpad slots."); }
  }
  function hasPadSlots(source) {
    const padsByKey = source && source.padsByKey ? source.padsByKey : {};
    const keys = Object.keys(padsByKey);
    let index = 0;
    while (index < keys.length) {
      if (Array.isArray(padsByKey[keys[index]]) && padsByKey[keys[index]].length > 0) { return true; }
      index += 1;
    }
    return false;
  }
  function clearPendingMount(runtime) {
    delete runtime.pendingPromises.mount;
  }
  function warnDisposed(instance, methodName) {
    if (methodName === "mount" && !instance.didWarnDisposedMount) { console.warn("[launchpad.mount] called after destroy; obtain a fresh instance from the factory"); instance.didWarnDisposedMount = true; }
    if (methodName === "dispatch" && !instance.didWarnDisposedDispatch) { console.warn("[launchpad.dispatch] called after destroy"); instance.didWarnDisposedDispatch = true; }
  }
  function toErrorMessage(err) { return err && err.message ? err.message : String(err || "Unknown launchpad error."); }
  function buildMountSucceededAction(buildResult) { return { type: "launchpad/mountSucceeded", payload: { tabs: buildResult.tabs, padsByKey: buildResult.padsByKey, helperTabIds: buildResult.helperTabIds, helperTabPageId: buildResult.helperTabPageId } }; }
  function buildMountFailedAction(err) { return { type: "launchpad/mountFailed", payload: { errorCode: "LAUNCHPAD_MOUNT_FAILED", errorMessage: toErrorMessage(err) } }; }
  return createLaunchpadController;
});

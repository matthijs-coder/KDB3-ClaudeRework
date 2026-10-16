define([
  "./state/cloneState.js",
  "./state/initialState.js",
  "./runtime/initializeRuntime.js",
  "./runtime/cleanupRuntime.js",
  "./lifecycle/writeLifecycle.js",
  "./routeWidgetSettingsDispatch.js"
], function (_cloneState, _initialState, _initializeRuntime, _cleanupRuntime, _writeLifecycle, _routeWidgetSettingsDispatch) {
  function createWidgetSettingsController(_deps) {
    try {
      const instance = { _KDB: _deps._KDB, isMounted: false, isDisposed: false, didWarnDisposedMount: false, didWarnDisposedDispatch: false };
      return { mount: mount.bind(null, instance), destroy: destroy.bind(null, instance), dispatch: dispatch.bind(null, instance), getState: getState.bind(null, instance) };
    } catch (err) {
      console.error("[widgetSettings.createController] failed", err);
      throw err;
    }
  }
  function mount(instance, _options) {
    try {
      if (instance.isDisposed) { warnDisposed(instance, "mount"); return false; }
      ensureState(instance._KDB);
      _initializeRuntime(instance._KDB);
      instance.isMounted = true;
      _writeLifecycle(instance._KDB, "ready");
      return true;
    } catch (err) {
      console.error("[widgetSettings.mount] failed", err);
      _writeLifecycle(instance._KDB, "error", err);
      return false;
    }
  }
  function destroy(instance) {
    try {
      if (instance.isDisposed) { return; }
      instance.isDisposed = true;
      instance.isMounted = false;
      _cleanupRuntime(instance._KDB);
      _writeLifecycle(instance._KDB, "disposed");
    } catch (err) {
      console.error("[widgetSettings.destroy] failed", err);
    }
  }
  function dispatch(instance, _action) {
    try {
      if (instance.isDisposed) { warnDisposed(instance, "dispatch"); return { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }; }
      return _routeWidgetSettingsDispatch(instance._KDB, _action);
    } catch (err) {
      console.error("[widgetSettings.dispatch] failed", err);
      _writeLifecycle(instance._KDB, "error", err);
      return { ok: false, skipped: true, reasonCode: "SCAFFOLD_ERROR" };
    }
  }
  function getState(instance) {
    try {
      if (instance.isDisposed) { return undefined; }
      return _cloneState(instance._KDB.state.widgets.settings);
    } catch (err) {
      console.error("[widgetSettings.getState] failed", err);
      return undefined;
    }
  }
  function warnDisposed(instance, methodName) {
    if (methodName === "mount" && !instance.didWarnDisposedMount) { console.warn("[widgetSettings.mount] called after destroy; obtain a fresh instance from the factory"); instance.didWarnDisposedMount = true; }
    if (methodName === "dispatch" && !instance.didWarnDisposedDispatch) { console.warn("[widgetSettings.dispatch] called after destroy"); instance.didWarnDisposedDispatch = true; }
  }
  function ensureState(_KDB) {
    try {
      _KDB.state.widgets = _KDB.state.widgets || {};
      if (!_KDB.state.widgets.settings) {
        _KDB.state.widgets.settings = _initialState();
      }
    } catch (err) {
      console.error("[widgetSettings.ensureState] failed", err);
      throw err;
    }
  }
  return createWidgetSettingsController;
});

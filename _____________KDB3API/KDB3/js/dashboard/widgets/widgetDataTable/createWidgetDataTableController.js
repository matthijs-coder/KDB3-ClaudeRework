define([
  "./state/cloneState.js",
  "./runtime/cleanupRuntime.js",
  "./lifecycle/writeLifecycle.js",
  "./effects/noopDispatchEffect.js"
], function (_cloneState, _cleanupRuntime, _writeLifecycle, _noopDispatchEffect) {
  function createWidgetDataTableController(_deps) {
    try {
      const instance = { _KDB: _deps._KDB, isMounted: false, isDisposed: false, didWarnDisposedMount: false, didWarnDisposedDispatch: false };
      return { mount: mount.bind(null, instance), destroy: destroy.bind(null, instance), dispatch: dispatch.bind(null, instance), getState: getState.bind(null, instance) };
    } catch (err) {
      console.error("[widgetDataTable.createController] failed", err);
      throw err;
    }
  }
  function mount(instance, _options) {
    try {
      if (instance.isDisposed) { warnDisposed(instance, "mount"); return false; }
      instance.isMounted = true;
      _writeLifecycle(instance._KDB, "ready");
      return true;
    } catch (err) {
      console.error("[widgetDataTable.mount] failed", err);
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
      console.error("[widgetDataTable.destroy] failed", err);
    }
  }
  function dispatch(instance, _action) {
    try {
      if (instance.isDisposed) { warnDisposed(instance, "dispatch"); return { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }; }
      // Scaffold tranche: all action types, including unknown ones, are no-op.
      return _noopDispatchEffect(_action);
    } catch (err) {
      console.error("[widgetDataTable.dispatch] failed", err);
      _writeLifecycle(instance._KDB, "error", err);
      return { ok: false, skipped: true, reasonCode: "SCAFFOLD_ERROR" };
    }
  }
  function getState(instance) {
    try {
      if (instance.isDisposed) { return undefined; }
      return _cloneState(instance._KDB.state.widgets.dataTable);
    } catch (err) {
      console.error("[widgetDataTable.getState] failed", err);
      return undefined;
    }
  }
  function warnDisposed(instance, methodName) {
    if (methodName === "mount" && !instance.didWarnDisposedMount) { console.warn("[widgetDataTable.mount] called after destroy; obtain a fresh instance from the factory"); instance.didWarnDisposedMount = true; }
    if (methodName === "dispatch" && !instance.didWarnDisposedDispatch) { console.warn("[widgetDataTable.dispatch] called after destroy"); instance.didWarnDisposedDispatch = true; }
  }
  return createWidgetDataTableController;
});

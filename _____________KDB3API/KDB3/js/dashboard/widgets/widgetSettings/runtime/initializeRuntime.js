define([], function () {
  function initializeRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.widgetSettings = _KDB.runtime.widgetSettings || {};
      const runtime = _KDB.runtime.widgetSettings;
      runtime.domRefs = runtime.domRefs || {};
      runtime.listeners = runtime.listeners || {};
      runtime.subscriptions = runtime.subscriptions || {};
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.observers = runtime.observers || {};
      runtime.timers = runtime.timers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      runtime.seedPlacementStarted = runtime.seedPlacementStarted || {};
      return runtime;
    } catch (err) {
      console.error("[widgetSettings.initializeRuntime] failed", err);
      throw err;
    }
  }
  return initializeRuntime;
});

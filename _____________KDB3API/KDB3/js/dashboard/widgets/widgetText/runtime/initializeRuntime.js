define([], function () {
  function initializeRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.widgetText = _KDB.runtime.widgetText || {};
      const runtime = _KDB.runtime.widgetText;
      runtime.domRefs = runtime.domRefs || {};
      runtime.listeners = runtime.listeners || {};
      runtime.subscriptions = runtime.subscriptions || {};
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.observers = runtime.observers || {};
      runtime.timers = runtime.timers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      runtime.styleElements = runtime.styleElements || {};
      runtime.byId = runtime.byId || {};
      return runtime;
    } catch (err) {
      console.error("[widgetText.initializeRuntime] failed", err);
      throw err;
    }
  }
  return initializeRuntime;
});

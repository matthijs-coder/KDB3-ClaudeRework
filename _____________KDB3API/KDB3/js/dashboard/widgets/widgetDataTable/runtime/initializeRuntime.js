define([], function () {
  function initializeRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.widgetDataTable = _KDB.runtime.widgetDataTable || {};
      const runtime = _KDB.runtime.widgetDataTable;
      runtime.domRefs = runtime.domRefs || {};
      runtime.listeners = runtime.listeners || {};
      runtime.subscriptions = runtime.subscriptions || {};
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.observers = runtime.observers || {};
      runtime.timers = runtime.timers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      return runtime;
    } catch (err) {
      console.error("[widgetDataTable.initializeRuntime] failed", err);
      throw err;
    }
  }
  return initializeRuntime;
});

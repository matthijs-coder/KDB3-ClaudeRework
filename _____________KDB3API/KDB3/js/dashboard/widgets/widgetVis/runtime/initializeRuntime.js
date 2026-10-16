define([], function () {
  "use strict";

  function initializeRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.widgetVis = _KDB.runtime.widgetVis || {};
      var runtime = _KDB.runtime.widgetVis;
      runtime.domRefs = runtime.domRefs || {};
      runtime.listeners = runtime.listeners || {};
      runtime.subscriptions = runtime.subscriptions || {};
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.observers = runtime.observers || {};
      runtime.timers = runtime.timers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      runtime.byId = runtime.byId || {};
      if (runtime.enableDrillthrough == null) {
        runtime.enableDrillthrough = true;
      }
      return runtime;
    } catch (err) {
      console.error("[widgetVis.initializeRuntime] failed", err);
      throw err;
    }
  }

  return initializeRuntime;
});

define([], function () {
  "use strict";

  function ensureFilterDockRuntime(_KDB) {
    var runtime = _KDB.runtime.filterDock || {};
    runtime.domRefs = runtime.domRefs || {};
    runtime.listeners = runtime.listeners || {};
    runtime.subscriptions = runtime.subscriptions || {};
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.observers = runtime.observers || {};
    runtime.timers = runtime.timers || {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    _KDB.runtime.filterDock = runtime;
    return runtime;
  }

  return ensureFilterDockRuntime;
});

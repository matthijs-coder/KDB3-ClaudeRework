define([], function () {
  "use strict";

  function __controller(_runtime) {
    try {
      _runtime.domRefs = {};
      _runtime.listeners = {};
      _runtime.subscriptions = {};
      _runtime.abortControllers = {};
      _runtime.pendingPromises = {};
      _runtime.adapters = {};
    } catch (err) {
      console.error("[metricsTree.clearMetricsTreeRuntime] clear failed", err);
      throw err;
    }
  }

  return __controller;
});

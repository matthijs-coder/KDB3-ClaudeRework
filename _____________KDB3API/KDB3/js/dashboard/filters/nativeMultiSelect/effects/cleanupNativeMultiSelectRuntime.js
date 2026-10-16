define([], function () {
  "use strict";

  function unsubscribeEntry(_runtime, _key) {
    var unsubscribe = _runtime.subscriptions[_key];
    if (typeof unsubscribe === "function") {
      try {
        unsubscribe();
      } catch (_error) {
        console.warn("[nativeMultiSelect.cleanupRuntime] subscriptions." + _key + " failed", _error);
      }
    }
  }

  function unsubscribeAll(_runtime) {
    var subscriptions = _runtime.subscriptions || {};
    var keys = Object.keys(subscriptions);
    var idx;
    for (idx = 0; idx < keys.length; idx += 1) {
      unsubscribeEntry(_runtime, keys[idx]);
    }
  }

  function cleanupNativeMultiSelectRuntime(_runtime) {
    if (!_runtime) {
      return;
    }
    unsubscribeAll(_runtime);
    _runtime.listeners = {};
    _runtime.subscriptions = {};
    _runtime.abortControllers = {};
    _runtime.observers = {};
    _runtime.timers = {};
    _runtime.pendingPromises = {};
    _runtime.tabMutationRunId = 0;
    _runtime.parameterSetRunId = 0;
    _runtime.tabMutationSnapshots = {};
    _runtime.historyReplayHandlerContribution = null;
  }

  return cleanupNativeMultiSelectRuntime;
});

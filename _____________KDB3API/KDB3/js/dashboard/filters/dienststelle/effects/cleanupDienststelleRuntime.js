define([], function () {
  "use strict";

  function unsubscribeEntry(_runtime, _key) {
    var unsubscribe = _runtime.subscriptions[_key];
    if (typeof unsubscribe === "function") {
      try {
        unsubscribe();
      } catch (_error) {
        console.warn("[dienststelle.cleanupRuntime] subscriptions." + _key + " failed", _error);
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

  function abortControllerEntry(_runtime, _key) {
    var controller = (_runtime.abortControllers || {})[_key];
    if (controller && typeof controller.abort === "function") {
      try {
        controller.abort();
      } catch (_error) {
        console.warn("[dienststelle.cleanupRuntime] abortControllers." + _key + " failed", _error);
      }
    }
  }

  function abortAll(_runtime) {
    var abortControllers = _runtime.abortControllers || {};
    var keys = Object.keys(abortControllers);
    var idx;
    for (idx = 0; idx < keys.length; idx += 1) {
      abortControllerEntry(_runtime, keys[idx]);
    }
  }

  function clearTimerEntry(_runtime, _key) {
    var timerId = (_runtime.timers || {})[_key];
    if (typeof timerId === "number") {
      try {
        clearTimeout(timerId);
        if (typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(timerId);
        }
      } catch (_error) {
        console.warn("[dienststelle.cleanupRuntime] timers." + _key + " failed", _error);
      }
    }
  }

  function clearAllTimers(_runtime) {
    var timers = _runtime.timers || {};
    var keys = Object.keys(timers);
    var idx;
    for (idx = 0; idx < keys.length; idx += 1) {
      clearTimerEntry(_runtime, keys[idx]);
    }
  }

  function cleanupDienststelleRuntime(_runtime) {
    if (!_runtime) {
      return;
    }
    unsubscribeAll(_runtime);
    abortAll(_runtime);
    clearAllTimers(_runtime);
    _runtime.domRefs = {};
    _runtime.listeners = {};
    _runtime.subscriptions = {};
    _runtime.abortControllers = {};
    _runtime.observers = {};
    _runtime.timers = {};
    _runtime.pendingPromises = {};
    _runtime.tabMutationRunId = 0;
    _runtime.tabMutationSnapshots = {};
    _runtime.historyReplayHandlerContribution = null;
  }

  return cleanupDienststelleRuntime;
});

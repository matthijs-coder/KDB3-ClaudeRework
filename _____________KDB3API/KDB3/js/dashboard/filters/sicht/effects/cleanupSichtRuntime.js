define([], function () {
  "use strict";

  function abortAllControllers(_runtime) {
    var controllers = _runtime.abortControllers || {};
    Object.keys(controllers).forEach(function (_key) {
      var controller = controllers[_key];
      if (controller && typeof controller.abort === "function") {
        try {
          controller.abort();
        } catch (error) {
          console.warn("[sicht.cleanupSichtRuntime] abortControllers." + _key + " failed", error);
        }
      }
    });
  }

  function unsubscribeAll(_runtime) {
    var subscriptions = _runtime.subscriptions || {};
    Object.keys(subscriptions).forEach(function (_key) {
      var unsubscribe = subscriptions[_key];
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch (error) {
          console.warn("[sicht.cleanupSichtRuntime] subscriptions." + _key + " failed", error);
        }
      }
    });
  }

  function disconnectAllObservers(_runtime) {
    var observers = _runtime.observers || {};
    Object.keys(observers).forEach(function (_key) {
      var observer = observers[_key];
      if (observer && typeof observer.disconnect === "function") {
        try {
          observer.disconnect();
        } catch (error) {
          console.warn("[sicht.cleanupSichtRuntime] observers." + _key + " failed", error);
        }
      }
    });
  }

  function clearAllTimers(_runtime) {
    var timers = _runtime.timers || {};
    Object.keys(timers).forEach(function (_key) {
      var timerId = timers[_key];
      try {
        clearTimeout(timerId);
      } catch (error) {
        try {
          clearInterval(timerId);
        } catch (innerError) {
          console.warn("[sicht.cleanupSichtRuntime] timers." + _key + " failed", innerError);
        }
      }
    });
  }

  function cleanupSichtRuntime(_runtime) {
    if (!_runtime) {
      return;
    }
    abortAllControllers(_runtime);
    unsubscribeAll(_runtime);
    disconnectAllObservers(_runtime);
    clearAllTimers(_runtime);
    _runtime.listeners = {};
    _runtime.domRefs = {};
    _runtime.pendingPromises = {};
    _runtime.subscriptions = {};
    _runtime.abortControllers = {};
    _runtime.observers = {};
    _runtime.timers = {};
    _runtime.delegatedOperationIds = {};
  }

  return cleanupSichtRuntime;
});

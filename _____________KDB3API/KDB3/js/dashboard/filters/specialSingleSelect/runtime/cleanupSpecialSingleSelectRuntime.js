define([], function () {
  "use strict";

  function unsubscribeSubscriptions(_runtime) {
    var subscriptions = _runtime.subscriptions || {};
    Object.keys(subscriptions).forEach(function (_key) {
      var unsubscribe = subscriptions[_key];
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch (_error) {
          // ignore unsubscribe races
        }
      }
    });
  }

  function abortControllers(_runtime) {
    var controllers = _runtime.abortControllers || {};
    Object.keys(controllers).forEach(function (_key) {
      var controller = controllers[_key];
      if (controller && typeof controller.abort === "function") {
        try {
          controller.abort();
        } catch (_error) {
          // ignore abort races
        }
      }
    });
  }

  function clearPendingPromises(_runtime) {
    _runtime.pendingPromises = {};
  }

  function cleanupSpecialSingleSelectRuntime(_runtime) {
    if (!_runtime) {
      return;
    }
    unsubscribeSubscriptions(_runtime);
    if (_runtime.abortControllers && _runtime.abortControllers.sync) {
      try {
        _runtime.abortControllers.sync.abort();
      } catch (_error) {
        // ignore abort races
      }
    }
    abortControllers(_runtime);
    clearPendingPromises(_runtime);
    _runtime.domRefs = {};
    _runtime.listeners = {};
    _runtime.subscriptions = {};
    _runtime.abortControllers = {};
    _runtime.observers = {};
    _runtime.timers = {};
    _runtime.pendingPromises = {};
  }

  return cleanupSpecialSingleSelectRuntime;
});

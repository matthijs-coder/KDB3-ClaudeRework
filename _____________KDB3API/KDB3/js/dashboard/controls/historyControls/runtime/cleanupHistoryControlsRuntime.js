define([], function () {
  "use strict";

  function eachBucket(_bucket, _onValue) {
    var key;
    for (key in _bucket) {
      if (Object.prototype.hasOwnProperty.call(_bucket, key)) {
        _onValue(_bucket[key], key);
      }
    }
  }

  function clearSubscriptions(_runtime) {
    eachBucket(_runtime.subscriptions, function (_handle, _key) {
      if (typeof _handle === "function") _handle();
      _runtime.subscriptions[_key] = null;
    });
  }

  function abortControllers(_runtime) {
    eachBucket(_runtime.abortControllers, function (_controller, _key) {
      if (_controller && _controller.abort) _controller.abort();
      _runtime.abortControllers[_key] = null;
    });
    eachBucket(_runtime.listeners || {}, function (_cleanup, _key) {
      if (typeof _cleanup === "function") _cleanup();
      _runtime.listeners[_key] = null;
    });
  }

  function disconnectObservers(_runtime) {
    eachBucket(_runtime.observers, function (_observer, _key) {
      if (_observer && _observer.disconnect) _observer.disconnect();
      _runtime.observers[_key] = null;
    });
  }

  function removePlacedRoot(_runtime) {
    var rootEl = _runtime.domRefs && _runtime.domRefs.rootEl;
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
  }

  function clearTimers(_runtime) {
    eachBucket(_runtime.timers, function (_timerId, _key) {
      if (_timerId) clearTimeout(_timerId);
      _runtime.timers[_key] = null;
    });
  }

  function resetRuntime(_KDB) {
    _KDB.runtime.historyControls = {
      domRefs: { toolbarHostEl: null, rootEl: null, undoButtonEl: null, redoButtonEl: null },
      subscriptions: { historyChanged: null },
      abortControllers: { mount: null, click: null },
      observers: { toolbar: null },
      timers: {},
      pendingPromises: { mount: null },
      listeners: {}
    };
  }

  function cleanupHistoryControlsRuntime(_KDB) {
    var runtime = _KDB.runtime.historyControls;
    abortControllers(runtime);
    clearSubscriptions(runtime);
    disconnectObservers(runtime);
    clearTimers(runtime);
    runtime.pendingPromises.mount = null;
    removePlacedRoot(runtime);
    resetRuntime(_KDB);
  }

  return cleanupHistoryControlsRuntime;
});

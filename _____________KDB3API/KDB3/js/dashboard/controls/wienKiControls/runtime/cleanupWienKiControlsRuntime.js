define([], function () {
  "use strict";

  function eachBucket(_bucket, _iteratee) {
    var key;
    for (key in _bucket) {
      if (Object.prototype.hasOwnProperty.call(_bucket, key)) _iteratee(_bucket[key], key);
    }
  }

  function abortRuntimeController(_runtime, _controller, _key) {
    if (_controller && typeof _controller.abort === "function") _controller.abort();
    _runtime.abortControllers[_key] = null;
  }

  function runListenerCleanup(_runtime, _cleanup, _key) {
    if (typeof _cleanup === "function") _cleanup();
    _runtime.listeners[_key] = null;
  }

  function disconnectRuntimeObserver(_runtime, _observer, _key) {
    if (_observer && typeof _observer.disconnect === "function") _observer.disconnect();
    _runtime.observers[_key] = null;
  }

  function clearRuntimeTimer(_runtime, _timerId, _key) {
    if (_timerId) clearTimeout(_timerId);
    _runtime.timers[_key] = null;
  }

  function cleanupWienKiControlsRuntime(_KDB) {
    var runtime = _KDB.runtime.wienKiControls;
    try {
      eachBucket(runtime.abortControllers, abortRuntimeController.bind(null, runtime));
      eachBucket(runtime.listeners, runListenerCleanup.bind(null, runtime));
      eachBucket(runtime.observers, disconnectRuntimeObserver.bind(null, runtime));
      eachBucket(runtime.timers, clearRuntimeTimer.bind(null, runtime));
      if (runtime.domRefs.rootEl && runtime.domRefs.rootEl.parentNode) {
        runtime.domRefs.rootEl.parentNode.removeChild(runtime.domRefs.rootEl);
      }
      _KDB.runtime.wienKiControls = {
        domRefs: { toolbarHostEl: null, rootEl: null, buttonEl: null, iconEl: null, labelEl: null },
        subscriptions: {}, listeners: {}, abortControllers: { mount: null },
        observers: {}, timers: {}, pendingPromises: { mount: null },
        viewModel: { disabled: false, serviceAvailable: true, label: "" }
      };
    } catch (err) {
      console.error("[wienKiControls.cleanupWienKiControlsRuntime]", err);
      throw err;
    }
  }

  return cleanupWienKiControlsRuntime;
});

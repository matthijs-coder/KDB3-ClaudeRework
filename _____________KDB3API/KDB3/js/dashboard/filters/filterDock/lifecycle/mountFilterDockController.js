define([
  "../config/actions.js",
  "../effects/waitForFilterDockReady.js",
  "../runtime/ensureFilterDockRuntime.js",
  "../runtime/cleanupFilterDockRuntime.js",
  "../runtime/readDockRoot.js",
  "./bindFilterDockMountBindings.js"
], function (
  _actions,
  _waitForFilterDockReady,
  _ensureFilterDockRuntime,
  _cleanupFilterDockRuntime,
  _readDockRoot,
  _mountBindings
) {
  "use strict";

  function isControllerDisposed(_controller) {
    return _controller.isDisposed;
  }

  function finishMount(_controller, _mountOptions, _deps) {
    var _KDB = _controller._KDB;
    var runtime = _ensureFilterDockRuntime(_KDB);
    var dispatchBound = _deps.dispatchInternal.bind(null, _controller);
    if (!_readDockRoot(_KDB)) {
      console.warn("[filterDock.mount] dock root not found");
      return false;
    }
    if (!_mountBindings.bindMountBindings(_KDB, runtime, dispatchBound, _mountOptions, _readDockRoot)) {
      console.error("[filterDock.mount] observer bind failed after click listener bind");
      _cleanupFilterDockRuntime.cleanupDockClickBinding(runtime);
      return false;
    }
    _deps.dispatchInternal(_controller, {
      type: _actions.MOUNT_SUCCEEDED,
      payload: { mountedAt: Date.now() }
    });
    return true;
  }

  function mount(_controller, _options, _deps) {
    var _KDB;
    var runtime;
    var mountOptions;
    var mountController;
    var mountSignal;
    if (_controller.isDisposed) {
      _deps.warnDisposed(_controller, "mount");
      return false;
    }
    try {
      _KDB = _controller._KDB;
      runtime = _ensureFilterDockRuntime(_KDB);
      mountOptions = Object.assign({}, _controller.options, _options || {});
      mountOptions.isDisposed = isControllerDisposed.bind(null, _controller);
      if (runtime.pendingPromises.mount) {
        return true;
      }
      mountSignal = null;
      if (typeof AbortController === "function") {
        mountController = new AbortController();
        runtime.abortControllers.mount = mountController;
        mountSignal = mountController.signal;
      }
      runtime.pendingPromises.mount = _waitForFilterDockReady(_KDB, { signal: mountSignal })
        .then(function () {
          if (_controller.isDisposed || (mountSignal && mountSignal.aborted)) {
            return false;
          }
          return finishMount(_controller, mountOptions, _deps);
        })
        .catch(function (error) {
          if (!error || error.code !== "ABORTED") {
            console.error("[filterDock.mount] filter dock wait failed", error);
          }
          return false;
        })
        .finally(function () {
          runtime.pendingPromises.mount = null;
          if (runtime.abortControllers) {
            delete runtime.abortControllers.mount;
          }
        });
      return true;
    } catch (error) {
      return _deps.handleBoundaryError(_controller, "mount", error);
    }
  }

  return {
    mount: mount
  };
});

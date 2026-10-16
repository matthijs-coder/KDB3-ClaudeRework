define([
  "../config/actions.js",
  "../observation/scheduleObservedDockState.js",
  "../runtime/ensureFilterDockRuntime.js",
  "../runtime/cleanupFilterDockRuntime.js"
], function (_actions, _scheduleObservedDockState, _ensureFilterDockRuntime, _cleanupFilterDockRuntime) {
  "use strict";

  var _runtimeCleanupDeps = {
    clearEvaluationTimer: _scheduleObservedDockState.clearEvaluationTimer
  };

  function destroy(_controller, _deps) {
    var _KDB;
    var runtime;
    if (_controller.isDisposed) {
      return;
    }
    _controller.isDisposed = true;
    try {
      _KDB = _controller._KDB;
      runtime = _ensureFilterDockRuntime(_KDB);
      if (runtime.abortControllers && runtime.abortControllers.mount) {
        runtime.abortControllers.mount.abort();
        delete runtime.abortControllers.mount;
      }
      runtime.pendingPromises.mount = null;
      _cleanupFilterDockRuntime(runtime, _runtimeCleanupDeps);
      if (_KDB.state && _KDB.state.filters) {
        _deps.dispatchInternal(_controller, { type: _actions.DESTROY, payload: {} });
      }
    } catch (error) {
      console.error("[filterDock.destroy] failed", error);
    }
  }

  return {
    destroy: destroy
  };
});

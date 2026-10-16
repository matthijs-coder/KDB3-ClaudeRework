define([
  "./config/actions.js",
  "./state/createSichtReducer.js",
  "./state/selectors.js",
  "./effects/ensureSichtRuntime.js",
  "./effects/cleanupSichtRuntime.js",
  "./actions/routeSichtAction.js"
], function (
  _actions,
  _createSichtReducer,
  _selectors,
  _ensureSichtRuntime,
  _cleanupSichtRuntime,
  _routeSichtAction
) {
  "use strict";
  function createSichtController(_deps) {
    var controller = {
      _KDB: _deps._KDB,
      options: _deps.options || {},
      reducer: _createSichtReducer(),
      runtime: _ensureSichtRuntime(_deps._KDB),
      isDisposed: false,
      didWarnDisposed: false
    };
    return {
      mount: mount.bind(null, controller),
      destroy: destroy.bind(null, controller),
      dispatch: dispatch.bind(null, controller),
      getState: getState.bind(null, controller)
    };
  }
  function dispatchInternal(_controller, _action) {
    var filtersState = _controller._KDB.state && _controller._KDB.state.filters;
    if (filtersState) {
      filtersState.sicht = _controller.reducer(filtersState.sicht, _action);
    }
  }
  function warnDisposed(_controller, _methodName) {
    if (!_controller.didWarnDisposed) {
      _controller.didWarnDisposed = true;
      console.warn("[sicht." + _methodName + "] called after destroy");
    }
  }
  function runRoute(_controller, _action) {
    return _routeSichtAction({
      _KDB: _controller._KDB,
      runtime: _controller.runtime,
      dispatchInternal: dispatchInternal.bind(null, _controller)
    }, _action);
  }
  function mount(_controller, _options) {
    if (_controller.isDisposed) {
      warnDisposed(_controller, "mount");
      return false;
    }
    try {
      _controller.runtime = _ensureSichtRuntime(_controller._KDB);
      _controller.options = Object.assign({}, _controller.options, _options || {});
      dispatchInternal(_controller, {
        type: _actions.MOUNT_SUCCEEDED,
        payload: { mountedAt: Date.now() }
      });
      if (_controller._KDB.services && _controller._KDB.services.tableData) {
        runRoute(_controller, { type: _actions.SYNC_REQUESTED, payload: {} });
      }
      return true;
    } catch (error) {
      console.error("[sicht.mount] failed", error);
      return false;
    }
  }
  function destroy(_controller) {
    if (_controller.isDisposed) {
      return;
    }
    _controller.isDisposed = true;
    try {
      _cleanupSichtRuntime(_controller.runtime);
      if (_controller._KDB.runtime && _controller._KDB.runtime.sicht) {
        _controller._KDB.runtime.sicht.historyReplayHandlerContribution = null;
      }
      dispatchInternal(_controller, { type: _actions.DESTROY, payload: {} });
    } catch (error) {
      console.error("[sicht.destroy] failed", error);
    }
  }
  function dispatch(_controller, _action) {
    var action = _action || {};
    if (_controller.isDisposed) {
      warnDisposed(_controller, "dispatch");
      if (_routeSichtAction.isParameterSetAction(action.type)) {
        return _routeSichtAction.disposedResult();
      }
      return _routeSichtAction.isAckAction(action.type)
        ? _routeSichtAction.disposedAckResult(action)
        : undefined;
    }
    try {
      var routed;
      if (_routeSichtAction.isRoutableAction(action.type)) {
        routed = runRoute(_controller, action);
        return _routeSichtAction.isAckAction(action.type) ? routed : _selectors.readSichtState(_controller._KDB);
      }
      return _selectors.readSichtState(_controller._KDB);
    } catch (error) {
      console.error("[sicht.dispatch] failed", error);
      dispatchInternal(_controller, {
        type: _actions.ERROR,
        payload: {
          errorCode: "SICHT_DISPATCH_FAILED",
          errorMessage: String(error.message || error)
        }
      });
      return _routeSichtAction.isAckAction(action.type) ? {
        ok: false,
        code: "SICHT_DISPATCH_FAILED",
        message: String(error.message || error)
      } : undefined;
    }
  }
  function getState(_controller) {
    return _controller.isDisposed ? undefined : _selectors.readSichtState(_controller._KDB);
  }
  return createSichtController;
});

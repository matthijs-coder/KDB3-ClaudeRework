define([
  "./config/actions.js",
  "./state/createSpecialSingleSelectReducer.js",
  "./state/selectors.js",
  "./effects/runSpecialSingleSelectSync.js",
  "./runtime/ensureSpecialSingleSelectRuntime.js",
  "./runtime/cleanupSpecialSingleSelectRuntime.js",
  "./specialSingleSelectControllerAcks.js"
], function (
  _actions,
  _createSpecialSingleSelectReducer,
  _selectors,
  _runSpecialSingleSelectSync,
  _ensureRuntime,
  _cleanupRuntime,
  _acks
) {
  "use strict";

  function createSpecialSingleSelectController(_deps) {
    var controller = {
      _KDB: _deps._KDB,
      options: _deps.options || {},
      reducer: _createSpecialSingleSelectReducer(),
      runtime: _ensureRuntime(_deps._KDB),
      isDisposed: false,
      didWarnDisposed: false,
      pendingInventoryGeneration: null,
      inventorySyncToken: null,
      lastInventoryGeneration: null,
      lastInventoryResult: null
    };
    return {
      mount: mount.bind(null, controller),
      destroy: destroy.bind(null, controller),
      dispatch: dispatch.bind(null, controller),
      getState: getState.bind(null, controller)
    };
  }

  function warnDisposed(_controller, _methodName) {
    if (!_controller.didWarnDisposed) {
      _controller.didWarnDisposed = true;
      console.warn("[specialSingleSelect." + _methodName + "] called after destroy");
    }
  }

  function mount(_controller, _options) {
    if (_controller.isDisposed) {
      warnDisposed(_controller, "mount");
      return false;
    }
    try {
      _controller.options = Object.assign({}, _controller.options, _options || {});
      _runSpecialSingleSelectSync.dispatchInternal(_controller, {
        type: _actions.MOUNT_SUCCEEDED,
        payload: { mountedAt: Date.now() }
      });
      _runSpecialSingleSelectSync.scheduleSync(_controller);
      return true;
    } catch (error) {
      console.error("[specialSingleSelect.mount] failed", error);
      return false;
    }
  }

  function destroy(_controller) {
    if (_controller.isDisposed) {
      return;
    }
    _controller.isDisposed = true;
    try {
      _cleanupRuntime(_controller.runtime);
      _runSpecialSingleSelectSync.dispatchInternal(_controller, { type: _actions.DESTROY, payload: {} });
    } catch (error) {
      console.error("[specialSingleSelect.destroy] failed", error);
    }
  }

  function dispatch(_controller, _action) {
    if (_controller.isDisposed) {
      warnDisposed(_controller, "dispatch");
      return _acks.isAckAction(_action && _action.type)
        ? _acks.buildDisposedAck(_action)
        : undefined;
    }
    try {
      var actionResult = _runSpecialSingleSelectSync.routeAction(_controller, _action || {});
      if (actionResult && typeof actionResult.then === "function") {
        return actionResult;
      }
      return _selectors.readSpecialSingleSelectState(_controller._KDB);
    } catch (error) {
      console.error("[specialSingleSelect.dispatch] failed", error);
      _runSpecialSingleSelectSync.dispatchInternal(_controller, {
        type: _actions.ERROR,
        payload: {
          errorCode: "SPECIAL_SINGLE_SELECT_DISPATCH_FAILED",
          errorMessage: String(error.message || error)
        }
      });
      return _acks.isAckAction(_action && _action.type)
        ? _acks.buildDispatchFailureAck(_action, error)
        : undefined;
    }
  }

  function getState(_controller) {
    return _controller.isDisposed ? undefined : _selectors.readSpecialSingleSelectState(_controller._KDB);
  }

  return createSpecialSingleSelectController;
});

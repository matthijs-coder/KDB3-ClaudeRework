define([
  "./config.js",
  "./state/createSingleSelectReducer.js",
  "./state/selectors.js",
  "./effects/guardInteractionFreshness.js",
  "./actions/dispatchSingleSelectAction.js",
  "./effects/ensureSingleSelectRuntime.js",
  "./singleSelectControllerGuards.js"
], function (
  _config,
  _createSingleSelectReducer,
  _selectors,
  _guardInteractionFreshness,
  _dispatchAction,
  _ensureRuntime,
  _guards
) {
  "use strict";

  function createSingleSelectController(_deps) {
    var controller = { _KDB: _deps._KDB, options: _deps.options || {}, reducer: _createSingleSelectReducer(), isDisposed: false, didWarnDisposed: false };
    return {
      mount: mount.bind(null, controller),
      destroy: destroy.bind(null, controller),
      dispatch: dispatch.bind(null, controller),
      getState: getState.bind(null, controller)
    };
  }

  function mount(_controller, _options) {
    if (_controller.isDisposed) {
      _guards.warnDisposed(_controller, "mount");
      return false;
    }
    try {
      _ensureRuntime(_controller._KDB);
      _controller.options = Object.assign({}, _controller.options, _options || {});
      _controller._KDB.state.filters.singleSelect.instancesById = _controller._KDB.state.filters.singleSelect.instancesById || {};
      _controller._KDB.state.filters.singleSelect.inventory = _controller._KDB.state.filters.singleSelect.inventory || {
        generation: 0, freshness: "stale", reconciledAt: null, errorCode: null
      };
      delete _controller._KDB.state.filters.singleSelect.byScope;
      _guards.dispatchInternal(_controller, { type: _config.actions.MOUNT_SUCCEEDED, payload: { mountedAt: Date.now() } });
      _dispatchAction(_controller._KDB, _ensureRuntime(_controller._KDB), {
        type: _config.actions.RECONCILE_FILTER_INSTANCES,
        payload: { reason: "mount" }
      }, _controller.options, _guards.dispatchInternal.bind(null, _controller));
      return true;
    } catch (error) {
      console.error("[singleSelect.mount] failed", error);
      _guards.dispatchInternal(_controller, {
        type: _config.actions.ERROR,
        payload: { errorCode: "SINGLE_SELECT_MOUNT_FAILED", errorMessage: String(error.message || error) }
      });
      return false;
    }
  }

  function destroy(_controller) {
    if (_controller.isDisposed) {
      return;
    }
    _controller.isDisposed = true;
    try {
      _guardInteractionFreshness.resetSingleSelectRuntime(_ensureRuntime(_controller._KDB));
      if (_controller._KDB.runtime && _controller._KDB.runtime.singleSelect) {
        _controller._KDB.runtime.singleSelect.historyReplayHandlerContribution = null;
      }
      if (_controller._KDB.state && _controller._KDB.state.filters) {
        _guards.dispatchInternal(_controller, { type: _config.actions.DESTROY, payload: {} });
      }
    } catch (error) {
      console.error("[singleSelect.destroy] failed", error);
    }
  }

  function dispatch(_controller, _action) {
    if (_controller.isDisposed) {
      _guards.warnDisposed(_controller, "dispatch");
      if (_action && _guards.isAsyncAction(_action.type)) {
        return _guards.disposedParameterSetResult(_action);
      }
      return undefined;
    }
    try {
      return _dispatchAction(
        _controller._KDB,
        _ensureRuntime(_controller._KDB),
        _action,
        _controller.options,
        _guards.dispatchInternal.bind(null, _controller)
      );
    } catch (error) {
      console.error("[singleSelect.dispatch] failed", error);
      _guards.dispatchInternal(_controller, {
        type: _config.actions.ERROR,
        payload: { errorCode: "SINGLE_SELECT_DISPATCH_FAILED", errorMessage: String(error.message || error) }
      });
      return undefined;
    }
  }

  function getState(_controller) {
    return _controller.isDisposed ? undefined : _selectors.readSingleSelectState(_controller._KDB);
  }

  return createSingleSelectController;
});

define([
  "./config/actions.js",
  "./state/createNativeMultiSelectReducer.js",
  "./effects/ensureNativeMultiSelectRuntime.js",
  "./effects/cleanupNativeMultiSelectRuntime.js",
  "./actions/tabMutation/routeTabMutationAction.js",
  "./actions/parameterSet/routeParameterSetAction.js",
  "./actions/parameterSet/parameterSetContext.js",
  "./actions/collectWritebackSnapshot.js",
  "./actions/routeNativeMultiSelectUserCommit.js"
], function (_actions, _createReducer, _ensureRuntime, _cleanupRuntime, _routeTabMutationAction, _routeParameterSetAction, _createParameterSetContext, _collectWritebackSnapshot, _routeUserCommit) {
  "use strict";

  function createNativeMultiSelectController(_deps) {
    var controller = {
      _KDB: _deps._KDB,
      filtersFacet: _deps.filtersFacet || null,
      options: _deps.options || {},
      reducer: _createReducer(),
      runtime: null,
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
      filtersState.nativeMultiSelect = _controller.reducer(filtersState.nativeMultiSelect, _action);
    }
  }

  function warnDisposed(_controller, _methodName) {
    if (!_controller.didWarnDisposed) {
      _controller.didWarnDisposed = true;
      console.warn("[nativeMultiSelect." + _methodName + "] called after destroy");
    }
  }

  function mount(_controller, _options) {
    if (_controller.isDisposed) {
      warnDisposed(_controller, "mount");
      return false;
    }
    try {
      _controller.runtime = _ensureRuntime(_controller._KDB);
      _controller.options = Object.assign({}, _controller.options, _options || {});
      dispatchInternal(_controller, { type: _actions.MOUNT_READY, payload: {} });
      return true;
    } catch (err) {
      console.error("[nativeMultiSelect.mount]", err);
      dispatchInternal(_controller, {
        type: _actions.ERROR,
        payload: { errorCode: "NATIVE_MULTI_SELECT_MOUNT_FAILED", errorMessage: String(err && err.message ? err.message : err) }
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
      _cleanupRuntime(_controller.runtime || _controller._KDB.runtime.nativeMultiSelect);
      dispatchInternal(_controller, { type: _actions.DESTROY, payload: {} });
    } catch (err) {
      console.error("[nativeMultiSelect.destroy]", err);
      dispatchInternal(_controller, {
        type: _actions.ERROR,
        payload: { errorCode: "NATIVE_MULTI_SELECT_DESTROY_FAILED", errorMessage: String(err && err.message ? err.message : err) }
      });
    }
  }

  function dispatch(_controller, _action) {
    var action = _action || {};
    if (_controller.isDisposed) {
      if (_routeParameterSetAction.isParameterSetAction(action.type)) {
        return _routeParameterSetAction.disposedResult();
      }
      if (action.type === _actions.COLLECT_WRITEBACK_SNAPSHOT_REQUESTED) {
        return { ok: true, entries: [], diagnostics: [] };
      }
      if (_routeTabMutationAction.isTabMutationAction(action.type)) {
        return _routeTabMutationAction.disposedResult(action.payload);
      }
      if (_routeUserCommit.isUserCommitAction(action.type)) {
        if (action.type === _actions.HISTORY_REPLAY_REQUESTED) {
          return false;
        }
        warnDisposed(_controller, "dispatch");
        return undefined;
      }
      warnDisposed(_controller, "dispatch");
      return undefined;
    }
    try {
      if (action.type === _actions.COLLECT_WRITEBACK_SNAPSHOT_REQUESTED) {
        return _collectWritebackSnapshot({ _KDB: _controller._KDB, filtersFacet: _controller.filtersFacet }, action.payload);
      }
      if (_routeParameterSetAction.isParameterSetAction(action.type)) {
        return _routeParameterSetAction(
          _createParameterSetContext(_controller, dispatchInternal.bind(null, _controller)),
          action
        );
      }
      if (_routeTabMutationAction.isTabMutationAction(action.type)) {
        return _routeTabMutationAction({
          _KDB: _controller._KDB,
          filtersFacet: _controller.filtersFacet,
          runtime: _controller.runtime || _ensureRuntime(_controller._KDB),
          dispatchInternal: dispatchInternal.bind(null, _controller)
        }, action);
      }
      if (_routeUserCommit.isUserCommitAction(action.type)) {
        return _routeUserCommit({
          _KDB: _controller._KDB,
          filtersFacet: _controller.filtersFacet,
          dispatchInternal: dispatchInternal.bind(null, _controller)
        }, action);
      }
      dispatchInternal(_controller, action);
      return getState(_controller);
    } catch (err) {
      console.error("[nativeMultiSelect.dispatch]", err);
      dispatchInternal(_controller, {
        type: _actions.ERROR,
        payload: { errorCode: "NATIVE_MULTI_SELECT_DISPATCH_FAILED", errorMessage: String(err && err.message ? err.message : err) }
      });
      return undefined;
    }
  }

  function getState(_controller) {
    if (_controller.isDisposed) { return undefined; }
    var filtersState = _controller._KDB.state && _controller._KDB.state.filters;
    return filtersState ? filtersState.nativeMultiSelect : undefined;
  }

  return createNativeMultiSelectController;
});

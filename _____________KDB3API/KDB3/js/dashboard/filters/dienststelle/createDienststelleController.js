define([
  "./config/actions.js",
  "./state/createDienststelleReducer.js",
  "./state/selectors.js",
  "./effects/readCurrentHierarchySnapshot.js",
  "./effects/ensureDienststelleRuntime.js",
  "./effects/cleanupDienststelleRuntime.js",
  "./effects/subscribeDienststelleTableDataChanges.js",
  "./actions/parameterSet/routeParameterSetAction.js",
  "./actions/parameterSet/parameterSetContext.js",
  "./actions/tabMutation/routeTabMutationAction.js",
  "./effects/reconcileConfirmedDienststelle.js",
  "./effects/routeDienststelleDispatch.js",
  "./effects/resolveDienststelleHistoryReplayDispatch.js"
], function (
  _actions,
  _createReducer,
  _selectors,
  _readCurrentHierarchySnapshot,
  _ensureRuntime,
  _cleanupRuntime,
  _subscribeTableDataChanges,
  _routeParameterSetAction,
  _createParameterSetContext,
  _routeTabMutationAction,
  _reconcile,
  _routeDispatch,
  _resolveHistoryReplayDispatch
) {
  "use strict";

  function createDienststelleController(_deps) {
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
      getState: getState.bind(null, controller),
      getCurrentHierarchySnapshot: getCurrentHierarchySnapshot.bind(null, controller)
    };
  }

  function dispatchInternal(_controller, _action) {
    var filtersState = _controller._KDB.state && _controller._KDB.state.filters;
    if (filtersState) {
      filtersState.dienststelle = _controller.reducer(filtersState.dienststelle, _action);
    }
  }

  function warnDisposed(_controller, _methodName) { if (!_controller.didWarnDisposed) { _controller.didWarnDisposed = true; console.warn("[dienststelle." + _methodName + "] called after destroy"); } }
  function reportError(_controller, _error) {
    dispatchInternal(_controller, { type: _actions.ERROR, payload: { errorCode: "DIENSTSTELLE_DISPATCH_FAILED", errorMessage: String(_error && _error.message ? _error.message : _error) } });
  }
  function isParameterSetAction(type) { return _routeParameterSetAction.isParameterSetAction(type); }
  function buildParameterSetContext(_controller) {
    return _createParameterSetContext(
      _controller,
      dispatch.bind(null, _controller),
      dispatchInternal.bind(null, _controller)
    );
  }
  function mount(_controller, _options) {
    var existingUnsubscribe;
    if (_controller.isDisposed) {
      warnDisposed(_controller, "mount");
      return false;
    }
    try {
      _controller.runtime = _ensureRuntime(_controller._KDB);
      _controller.options = Object.assign({}, _controller.options, _options || {});
      dispatchInternal(_controller, { type: _actions.MOUNT_READY, payload: { mountedAt: Date.now() } });
      existingUnsubscribe = _controller.runtime.subscriptions.tableDataLoadFinished;
      if (typeof existingUnsubscribe === "function") { existingUnsubscribe(); }
      _controller.runtime.subscriptions.tableDataLoadFinished = _subscribeTableDataChanges(_controller._KDB, { mount: mount.bind(null, _controller), destroy: destroy.bind(null, _controller), dispatch: dispatch.bind(null, _controller), getState: getState.bind(null, _controller) });
      return true;
    } catch (error) {
      console.error("[dienststelle.mount] failed", error);
      return false;
    }
  }

  function destroy(_controller) {
    if (_controller.isDisposed) {
      return;
    }
    _controller.isDisposed = true;
    try {
      _cleanupRuntime(_controller.runtime || _controller._KDB.runtime.dienststelle);
      dispatchInternal(_controller, { type: _actions.DESTROY, payload: {} });
    } catch (error) {
      console.error("[dienststelle.destroy] failed", error);
    }
  }

  function dispatch(_controller, _action) {
    var action = _action || {};
    if (_controller.isDisposed) {
      warnDisposed(_controller, "dispatch");
      if (isParameterSetAction(action.type)) { return _routeParameterSetAction.disposedResult(); }
      if (_routeTabMutationAction.isTabMutationAction(action.type)) { return _routeTabMutationAction.disposedResult(action.payload); }
      return undefined;
    }
    try {
      if (isParameterSetAction(action.type)) { return _routeParameterSetAction(buildParameterSetContext(_controller), action); }
      if (_routeTabMutationAction.isTabMutationAction(action.type)) {
        // No filtersFacet here on purpose: the dienststelle tab-mutation effects
        // resolve it through the module's host choke point, per the recorded
        // deviation in contracts/cognosHostService.md section 7.
        return _routeTabMutationAction({ _KDB: _controller._KDB, runtime: _controller.runtime || _ensureRuntime(_controller._KDB), dispatchInternal: dispatchInternal.bind(null, _controller) }, action);
      }
      var routePromise = _routeDispatch(_controller, dispatchInternal.bind(null, _controller), _reconcile, action);
      if (action.type === _actions.HISTORY_REPLAY_REQUESTED) {
        return _resolveHistoryReplayDispatch(routePromise, reportError.bind(null, _controller));
      }
      routePromise.catch(reportError.bind(null, _controller));
      return _selectors.readDienststelleState(_controller._KDB);
    } catch (error) {
      console.error("[dienststelle.dispatch] failed", error);
      reportError(_controller, error);
      return undefined;
    }
  }

  function getState(_controller) {
    return _controller.isDisposed ? undefined : _selectors.readDienststelleState(_controller._KDB);
  }

  function getCurrentHierarchySnapshot(_controller, _options) {
    return _controller.isDisposed ? undefined : _readCurrentHierarchySnapshot.readCurrentHierarchySnapshot(_controller._KDB, _options);
  }

  return createDienststelleController;
});

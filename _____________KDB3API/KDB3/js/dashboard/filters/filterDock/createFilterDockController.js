define([
  "./config/actions.js",
  "./state/createFilterDockReducer.js",
  "./state/selectors.js",
  "./effects/dispatchFilterDockDomAction.js",
  "./lifecycle/runFilterDockControllerLifecycle.js"
], function (
  _actions,
  _createFilterDockReducer,
  _selectors,
  _dispatchFilterDockDomAction,
  _lifecycle
) {
  "use strict";

  function createFilterDockController(_deps) {
    var controller = {
      _KDB: _deps._KDB,
      options: _deps.options || {},
      reducer: _createFilterDockReducer(),
      isDisposed: false,
      didWarnDisposed: false
    };
    var lifecycleDeps = {
      dispatchInternal: dispatchInternal,
      warnDisposed: warnDisposed,
      handleBoundaryError: handleBoundaryError
    };
    return {
      mount: function (_options) {
        return _lifecycle.mount(controller, _options, lifecycleDeps);
      },
      destroy: function () {
        return _lifecycle.destroy(controller, lifecycleDeps);
      },
      dispatch: dispatch.bind(null, controller),
      getState: getState.bind(null, controller)
    };
  }

  function dispatch(controller, _action) {
    if (controller.isDisposed) {
      warnDisposed(controller, "dispatch");
      return undefined;
    }
    try {
      dispatchInternal(controller, _action);
      return _selectors.readFilterDockState(controller._KDB);
    } catch (error) {
      handleBoundaryError(controller, "dispatch", error);
      return undefined;
    }
  }

  function getState(controller) {
    return controller.isDisposed ? undefined : _selectors.readFilterDockState(controller._KDB);
  }

  function dispatchInternal(controller, _action) {
    var filtersState = controller._KDB.state && controller._KDB.state.filters;
    if (!filtersState) {
      return;
    }
    if (
      _action &&
      (_action.type === _actions.CLICK_ORIGINAL_BUTTON_REQUESTED ||
        _action.type === _actions.CLOSE_ACTIVE_POPUP_REQUESTED)
    ) {
      _dispatchFilterDockDomAction(controller._KDB, _action);
      return;
    }
    filtersState.filterDock = controller.reducer(filtersState.filterDock, _action);
  }

  function warnDisposed(_controller, _methodName) {
    if (!_controller.didWarnDisposed) {
      _controller.didWarnDisposed = true;
      console.warn("[filterDock." + _methodName + "] called after destroy");
    }
  }

  function handleBoundaryError(_controller, _methodName, _error) {
    console.error("[filterDock." + _methodName + "] failed", _error);
    if (_controller._KDB.state && _controller._KDB.state.filters) {
      dispatchInternal(_controller, {
        type: _actions.ERROR,
        payload: {
          errorCode: "FILTER_DOCK_" + _methodName.toUpperCase() + "_FAILED",
          errorMessage: toErrorMessage(_error)
        }
      });
    }
    return false;
  }

  function toErrorMessage(_error) {
    return _error && _error.message ? _error.message : String(_error);
  }

  return createFilterDockController;
});

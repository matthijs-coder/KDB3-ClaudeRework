define([
  "./config/actionTypes.js",
  "./state/createWidgetVisReducer.js",
  "./state/selectors.js",
  "./runtime/initializeRuntime.js",
  "./runtime/cleanupRuntime.js",
  "./actions/normalizeDispatchResult.js",
  "./actions/actionRouter.js",
  "./actions/handleDienststelleChanged.js",
  "./controllerHelpers.js"
], function (
  _actionTypes,
  _createWidgetVisReducer,
  _selectors,
  _initializeRuntime,
  _cleanupRuntime,
  _normalizeDispatchResult,
  _routeAction,
  _handleDienststelleHandlers,
  _controllerHelpers
) {
  "use strict";

  function createWidgetVisController(_deps) {
    try {
      var instance = {
        _KDB: _deps._KDB,
        options: _deps.options || {},
        selectors: _deps.selectors || _selectors,
        reducer: _createWidgetVisReducer(),
        isDisposed: false,
        didWarnDisposedMount: false,
        didWarnDisposedDispatch: false,
        dispatchInternal: function (_action) {
          _controllerHelpers.dispatchInternal(instance, _action);
        }
      };
      return {
        mount: mount.bind(null, instance),
        destroy: destroy.bind(null, instance),
        dispatch: dispatch.bind(null, instance),
        getState: getState.bind(null, instance)
      };
    } catch (err) {
      console.error("[widgetVis.createController] failed", err);
      throw err;
    }
  }

  function mount(instance, _options) {
    try {
      if (instance.isDisposed) {
        _controllerHelpers.warnDisposed(instance, "mount");
        return false;
      }
      var opts = _options || {};
      var enable = opts.enableDrillthrough !== false;
      _controllerHelpers.ensureVisState(instance._KDB);
      _initializeRuntime(instance._KDB);
      instance._KDB.runtime.widgetVis.enableDrillthrough = enable;
      instance.dispatchInternal({ type: _actionTypes.MOUNT_STARTED });
      instance.dispatchInternal({ type: _actionTypes.MOUNT_SUCCEEDED });
      return true;
    } catch (err) {
      console.error("[widgetVis.mount] failed", err);
      instance.dispatchInternal({
        type: _actionTypes.ERROR_RECORDED,
        payload: { errorCode: "WIDGET_VIS_MOUNT_FAILED", errorMessage: String(err && err.message ? err.message : err) }
      });
      return false;
    }
  }

  function destroy(instance) {
    try {
      if (instance.isDisposed) {
        return;
      }
      instance.isDisposed = true;
      _cleanupRuntime(instance._KDB);
      instance.dispatchInternal({ type: _actionTypes.DESTROY });
    } catch (err) {
      console.error("[widgetVis.destroy] failed", err);
      instance.dispatchInternal({
        type: _actionTypes.ERROR_RECORDED,
        payload: {
          errorCode: "WIDGET_VIS_DESTROY_FAILED",
          errorMessage: String(err && err.message ? err.message : err)
        }
      });
    }
  }

  function dispatch(instance, _action) {
    try {
      if (instance.isDisposed) {
        _controllerHelpers.warnDisposed(instance, "dispatch");
        return Promise.resolve(_normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }));
      }
      var action = _controllerHelpers.validateAction(_action);
      if (action.errorCode) {
        return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: action.errorCode }));
      }
      if (action.type === _actionTypes.DIENSTSTELLE_CHANGED && !action.widgetId) {
        return _handleDienststelleHandlers.broadcastDienststelleChanged(_controllerHelpers.buildContext(instance), action)
          .then(_normalizeDispatchResult);
      }
      return _routeAction(_controllerHelpers.buildContext(instance), action);
    } catch (err) {
      console.error("[widgetVis.dispatch] failed", err);
      instance.dispatchInternal({
        type: _actionTypes.ERROR_RECORDED,
        payload: { errorCode: "WIDGET_VIS_MOUNT_FAILED", errorMessage: String(err && err.message ? err.message : err) }
      });
      return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_VIS_MOUNT_FAILED" }));
    }
  }

  function getState(instance) {
    try {
      if (instance.isDisposed) {
        return undefined;
      }
      return _controllerHelpers.cloneVisState(instance._KDB);
    } catch (err) {
      console.error("[widgetVis.getState] failed", err);
      return undefined;
    }
  }

  return createWidgetVisController;
});

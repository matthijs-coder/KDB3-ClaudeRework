define([
  "./state.js",
  "./selectors.js",
  "./runtime.js",
  "./runtime/cleanupRuntime.js",
  "./results.js",
  "./actions/actionRouter.js",
  "./actions/handleDienststelleChanged.js",
  "./context.js"
], function (_state, _selectors, _visRuntime, _cleanupRuntime, _results, _routeAction, _handleDienststelleHandlers, _visContext) {
  "use strict";

  function createWidgetVisController(_deps) {
    try {
      var instance = {
        _KDB: _deps._KDB,
        options: _deps.options || {},
        selectors: _deps.selectors || _selectors,
        reducer: _state.createWidgetVisReducer(),
        isDisposed: false,
        didWarnDisposedMount: false,
        didWarnDisposedDispatch: false,
        dispatchInternal: function (_action) {
          _visContext.dispatchInternal(instance, _action);
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
        _visContext.warnDisposed(instance, "mount");
        return false;
      }
      var opts = _options || {};
      var enable = opts.enableDrillthrough !== false;
      _visContext.ensureVisState(instance._KDB);
      _visRuntime.initializeRuntime(instance._KDB);
      instance._KDB.runtime.widgetVis.enableDrillthrough = enable;
      instance.dispatchInternal({ type: _state.ACTION_TYPES.MOUNT_STARTED });
      instance.dispatchInternal({ type: _state.ACTION_TYPES.MOUNT_SUCCEEDED });
      return true;
    } catch (err) {
      console.error("[widgetVis.mount] failed", err);
      instance.dispatchInternal({
        type: _state.ACTION_TYPES.ERROR_RECORDED,
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
      instance.dispatchInternal({ type: _state.ACTION_TYPES.DESTROY });
    } catch (err) {
      console.error("[widgetVis.destroy] failed", err);
      instance.dispatchInternal({
        type: _state.ACTION_TYPES.ERROR_RECORDED,
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
        _visContext.warnDisposed(instance, "dispatch");
        return Promise.resolve(_results.normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }));
      }
      var action = _visContext.validateAction(_action);
      if (action.errorCode) {
        return Promise.resolve(_results.normalizeDispatchResult({ ok: false, errorCode: action.errorCode }));
      }
      if (action.type === _state.ACTION_TYPES.DIENSTSTELLE_CHANGED && !action.widgetId) {
        return _handleDienststelleHandlers.broadcastDienststelleChanged(_visContext.buildContext(instance), action)
          .then(_results.normalizeDispatchResult);
      }
      return _routeAction(_visContext.buildContext(instance), action);
    } catch (err) {
      console.error("[widgetVis.dispatch] failed", err);
      instance.dispatchInternal({
        type: _state.ACTION_TYPES.ERROR_RECORDED,
        payload: { errorCode: "WIDGET_VIS_MOUNT_FAILED", errorMessage: String(err && err.message ? err.message : err) }
      });
      return Promise.resolve(_results.normalizeDispatchResult({ ok: false, errorCode: "WIDGET_VIS_MOUNT_FAILED" }));
    }
  }

  function getState(instance) {
    try {
      if (instance.isDisposed) {
        return undefined;
      }
      return _visContext.cloneVisState(instance._KDB);
    } catch (err) {
      console.error("[widgetVis.getState] failed", err);
      return undefined;
    }
  }

  return createWidgetVisController;
});

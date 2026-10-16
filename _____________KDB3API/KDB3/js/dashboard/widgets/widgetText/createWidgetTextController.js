define([
  "./config/actionTypes.js",
  "./state/createWidgetTextReducer.js",
  "./state/cloneSerializable.js",
  "./state/selectors.js",
  "./runtime/initializeRuntime.js",
  "./effects/cleanupWidgetTextRuntime.js",
  "./actions/normalizeDispatchResult.js",
  "./actions/routeWidgetTextDispatch.js",
  "./widgetTextDispatchContext.js"
], function (
  _actionTypes,
  _createWidgetTextReducer,
  _cloneSerializable,
  _selectors,
  _initializeRuntime,
  _cleanupWidgetTextRuntime,
  _normalizeDispatchResult,
  _routeWidgetTextDispatch,
  _widgetTextDispatchContext
) {
  function createWidgetTextController(_deps) {
    try {
      var instance = {
        _KDB: _deps._KDB,
        options: _deps.options || {},
        selectors: _deps.selectors || _selectors,
        reducer: _createWidgetTextReducer(),
        isDisposed: false,
        didWarnDisposedMount: false,
        didWarnDisposedDispatch: false,
        widgetsFacet: _deps.widgetsFacet || null
      };
      return {
        mount: mount.bind(null, instance),
        destroy: destroy.bind(null, instance),
        dispatch: dispatch.bind(null, instance),
        getState: getState.bind(null, instance)
      };
    } catch (err) {
      console.error("[widgetText.createController] failed", err);
      throw err;
    }
  }

  function mount(instance, _options) {
    try {
      if (instance.isDisposed) {
        _widgetTextDispatchContext.warnDisposed(instance, "mount");
        return false;
      }
      instance.options = Object.assign({}, instance.options, _options || {});
      _widgetTextDispatchContext.ensureTextState(instance._KDB);
      _initializeRuntime(instance._KDB);
      _widgetTextDispatchContext.dispatchInternal(instance, { type: _actionTypes.MOUNT_STARTED });
      _widgetTextDispatchContext.dispatchInternal(instance, { type: _actionTypes.MOUNT_SUCCEEDED });
      return true;
    } catch (err) {
      console.error("[widgetText.mount] failed", err);
      _widgetTextDispatchContext.dispatchInternal(instance, {
        type: _actionTypes.ERROR_RECORDED,
        payload: {
          moduleLevel: true,
          errorCode: "WIDGET_TEXT_MOUNT_FAILED",
          errorMessage: String(err && err.message ? err.message : err)
        }
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
      _cleanupWidgetTextRuntime(instance._KDB);
      _widgetTextDispatchContext.dispatchInternal(instance, { type: _actionTypes.DESTROY });
    } catch (err) {
      console.error("[widgetText.destroy] failed", err);
      _widgetTextDispatchContext.dispatchInternal(instance, {
        type: _actionTypes.ERROR_RECORDED,
        payload: {
          moduleLevel: true,
          errorCode: "WIDGET_TEXT_DESTROY_FAILED",
          errorMessage: String(err && err.message ? err.message : err)
        }
      });
    }
  }

  function dispatch(instance, _action) {
    try {
      if (instance.isDisposed) {
        _widgetTextDispatchContext.warnDisposed(instance, "dispatch");
        return Promise.resolve(_normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }));
      }
      _widgetTextDispatchContext.ensureTextState(instance._KDB);
      _initializeRuntime(instance._KDB);
      var validated = _widgetTextDispatchContext.validateAction(_action);
      if (validated.errorCode) {
        return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: validated.errorCode }));
      }
      return _routeWidgetTextDispatch.routeAction(_widgetTextDispatchContext.buildContext(instance), validated)
        .then(_normalizeDispatchResult);
    } catch (err) {
      console.error("[widgetText.dispatch] failed", err);
      _widgetTextDispatchContext.dispatchInternal(instance, {
        type: _actionTypes.ERROR_RECORDED,
        payload: {
          moduleLevel: true,
          errorCode: "WIDGET_TEXT_UNKNOWN_ACTION",
          errorMessage: String(err && err.message ? err.message : err)
        }
      });
      return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_TEXT_UNKNOWN_ACTION" }));
    }
  }

  function getState(instance) {
    try {
      if (instance.isDisposed) {
        return undefined;
      }
      return _cloneSerializable(instance._KDB.state.widgets.text);
    } catch (err) {
      console.error("[widgetText.getState] failed", err);
      return undefined;
    }
  }

  return createWidgetTextController;
});

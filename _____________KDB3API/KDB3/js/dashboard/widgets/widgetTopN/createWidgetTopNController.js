define([
  "./config/actionTypes.js",
  "./state/initialState.js",
  "./state/createWidgetTopNReducer.js",
  "./state/cloneSerializable.js",
  "./runtime/ensureWidgetTopNRuntime.js",
  "./actions/routeWidgetTopNDispatch.js",
  "./actions/normalizeDispatchResult.js"
], function (
  _actionTypes,
  _initialState,
  _createWidgetTopNReducer,
  _cloneSerializable,
  _runtime,
  _routeWidgetTopNDispatch,
  _normalizeDispatchResult
) {
  "use strict";

  function createWidgetTopNController(_deps) {
    var instance = {
      _KDB: _deps._KDB,
      options: _deps.options || {},
      selectors: _deps.selectors || {},
      reducer: _createWidgetTopNReducer(),
      isDisposed: false,
      didWarnDisposedMount: false,
      didWarnDisposedDispatch: false
    };
    return {
      mount: mount.bind(null, instance),
      destroy: destroy.bind(null, instance),
      dispatch: dispatch.bind(null, instance),
      getState: getState.bind(null, instance)
    };
  }

  function mount(instance, _options) {
    try {
      if (instance.isDisposed) { warnDisposed(instance, "mount"); return false; }
      instance.options = Object.assign({}, instance.options, _options || {});
      ensureState(instance._KDB);
      _runtime.ensureRuntime(instance._KDB);
      dispatchInternal(instance, { type: _actionTypes.MOUNT_STARTED });
      dispatchInternal(instance, { type: _actionTypes.MOUNT_SUCCEEDED });
      return true;
    } catch (err) {
      console.error("[widgetTopN.mount] failed", err);
      dispatchInternal(instance, {
        type: _actionTypes.ERROR_RECORDED,
        payload: { moduleLevel: true, errorCode: "WIDGET_TOPN_MOUNT_FAILED", errorMessage: messageFromError(err) }
      });
      return false;
    }
  }

  function destroy(instance) {
    try {
      if (instance.isDisposed) { return; }
      instance.isDisposed = true;
      _runtime.cleanupRuntime(instance._KDB);
      dispatchInternal(instance, { type: _actionTypes.DESTROY });
    } catch (err) {
      console.error("[widgetTopN.destroy] failed", err);
    }
  }

  function dispatch(instance, _action) {
    try {
      if (instance.isDisposed) {
        warnDisposed(instance, "dispatch");
        return Promise.resolve(_normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", status: "aborted" }));
      }
      ensureState(instance._KDB);
      _runtime.ensureRuntime(instance._KDB);
      return _routeWidgetTopNDispatch.routeAction(buildContext(instance), _routeWidgetTopNDispatch.validateAction(_action)).then(_normalizeDispatchResult);
    } catch (err) {
      console.error("[widgetTopN.dispatch] failed", err);
      dispatchInternal(instance, {
        type: _actionTypes.ERROR_RECORDED,
        payload: { moduleLevel: true, errorCode: "WIDGET_TOPN_INVALID_REQUEST", errorMessage: messageFromError(err) }
      });
      return Promise.resolve(_normalizeDispatchResult({ ok: false, status: "error", errorCode: "WIDGET_TOPN_INVALID_REQUEST" }));
    }
  }

  function getState(instance) {
    try {
      if (instance.isDisposed) { return undefined; }
      return _cloneSerializable(instance._KDB.state.widgets.topN);
    } catch (err) {
      console.error("[widgetTopN.getState] failed", err);
      return undefined;
    }
  }

  function buildContext(_instance) {
    return {
      _KDB: _instance._KDB,
      selectors: _instance.selectors,
      actionTypes: _actionTypes,
      dispatchInternal: dispatchInternal.bind(null, _instance),
      beginOwnerOperation: beginOwnerOperation.bind(null, _instance),
      readOwnerRuntime: readOwnerRuntime.bind(null, _instance),
      isStaleOpSeq: isStaleOpSeq.bind(null, _instance)
    };
  }

  function beginOwnerOperation(_instance, _ownerVisId, _requestedOpSeq) {
    return _runtime.beginOwnerResolve(_instance._KDB, _ownerVisId, _requestedOpSeq);
  }

  function readOwnerRuntime(_instance, _ownerVisId) {
    return _runtime.ensureOwnerRuntime(_instance._KDB, _ownerVisId);
  }

  function isStaleOpSeq(_instance, _ownerVisId, _opSeq) {
    return _runtime.isOwnerOpSeqStale(_instance._KDB, _ownerVisId, _opSeq);
  }

  function dispatchInternal(_instance, _action) {
    _instance._KDB.state.widgets.topN = _instance.reducer(_instance._KDB.state.widgets.topN, _action);
  }

  function ensureState(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
    if (!_KDB.state.widgets.topN) {
      _KDB.state.widgets.topN = _initialState();
    }
  }

  function messageFromError(err) {
    return String(err && err.message ? err.message : err);
  }

  function warnDisposed(instance, methodName) {
    if (methodName === "mount" && !instance.didWarnDisposedMount) {
      console.warn("[widgetTopN.mount] called after destroy; obtain a fresh instance from the factory");
      instance.didWarnDisposedMount = true;
    }
    if (methodName === "dispatch" && !instance.didWarnDisposedDispatch) {
      console.warn("[widgetTopN.dispatch] called after destroy");
      instance.didWarnDisposedDispatch = true;
    }
  }

  return createWidgetTopNController;
});

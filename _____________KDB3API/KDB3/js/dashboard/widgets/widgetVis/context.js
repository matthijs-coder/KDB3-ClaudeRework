define([
  "./state.js",
  "./selectors.js",
  "./bindingConfig.js",
  "./runtime.js",
  "./settingsSnapshot.js"
], function (
  _state,
  _selectors,
  _bindingConfig,
  _runtime,
  _settingsSnapshot
) {
  "use strict";

  function buildContext(_instance) {
    return {
      _KDB: _instance._KDB,
      selectors: _instance.selectors,
      actionTypes: _state.ACTION_TYPES,
      dispatchInternal: _instance.dispatchInternal,
      isDisposed: _instance.isDisposed,
      ensureOpSeq: ensureOpSeq.bind(null, _instance),
      isStaleOpSeq: isStaleOpSeq.bind(null, _instance),
      readMetric: readMetric.bind(null, _instance),
      readSettingsSnapshot: readSettingsSnapshot.bind(null, _instance)
    };
  }

  function createDetachedContext(_KDB) {
    var instance;
    ensureVisState(_KDB);
    instance = { _KDB: _KDB, selectors: _selectors, reducer: _state.createWidgetVisReducer(), isDisposed: false };
    instance.dispatchInternal = function (_action) {
      dispatchInternal(instance, _action);
    };
    return buildContext(instance);
  }

  function readMetric(_instance, _widgetId) {
    var record = _instance.selectors.readVisRecord(_instance._KDB, _widgetId);
    var derived = record && record.derived ? record.derived : {};
    return {
      code: derived.code || derived.kennzahlCode || "",
      display: derived.display || derived.code || "",
      metricsTable: derived.metricsTable || derived.datasourceName || _bindingConfig.resolveCurrentMetricsDataSource(_instance._KDB)
    };
  }

  function readSettingsSnapshot(_instance, _widgetId, _payload) {
    var record = _instance.selectors.readVisRecord(_instance._KDB, _widgetId);
    return _settingsSnapshot.readEffectiveSettingsContext(
      _instance._KDB,
      _widgetId,
      _payload,
      record
    );
  }

  function validateAction(_action) {
    var action = _action || {};
    if (action.widgetId && action.payload && action.payload.widgetId && action.widgetId !== action.payload.widgetId) {
      return { errorCode: "WIDGET_VIS_WIDGET_ID_CONFLICT" };
    }
    return action;
  }

  function dispatchInternal(_instance, _action) {
    _instance._KDB.state.widgets.vis = _instance.reducer(_instance._KDB.state.widgets.vis, _action);
  }

  function ensureVisState(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
    if (!_KDB.state.widgets.vis) {
      _KDB.state.widgets.vis = _state.createInitialWidgetVisState();
    }
  }

  function ensureOpSeq(_instance, _widgetId, _requestedOpSeq) {
    var runtime = _runtime.ensureWidgetRuntime(_instance._KDB, _widgetId);
    if (typeof _requestedOpSeq === "number") {
      runtime.opSeq = _requestedOpSeq;
      return _requestedOpSeq;
    }
    runtime.opSeq = (runtime.opSeq || 0) + 1;
    return runtime.opSeq;
  }

  function isStaleOpSeq(_instance, _widgetId, _opSeq) {
    var runtime = _instance._KDB.runtime && _instance._KDB.runtime.widgetVis && _instance._KDB.runtime.widgetVis.byId
      ? _instance._KDB.runtime.widgetVis.byId[_widgetId]
      : null;
    if (typeof _opSeq !== "number") {
      return false;
    }
    if (!runtime) {
      // Bucket verwijderd door disposeWidgetRuntime (park/tab-delete/remove,
      // E0a): elke nog lopende operatie op deze widget is per definitie stale.
      return true;
    }
    return runtime.opSeq !== _opSeq;
  }

  function warnDisposed(_instance, _methodName) {
    if (_methodName === "mount" && !_instance.didWarnDisposedMount) {
      console.warn("[widgetVis.mount] called after destroy; obtain a fresh instance from the factory");
      _instance.didWarnDisposedMount = true;
    }
    if (_methodName === "dispatch" && !_instance.didWarnDisposedDispatch) {
      console.warn("[widgetVis.dispatch] called after destroy");
      _instance.didWarnDisposedDispatch = true;
    }
  }

  function cloneVisState(_KDB) {
    return _state.cloneState(_KDB.state.widgets.vis);
  }

  return {
    buildContext: buildContext,
    createDetachedContext: createDetachedContext,
    readMetric: readMetric,
    readSettingsSnapshot: readSettingsSnapshot,
    validateAction: validateAction,
    dispatchInternal: dispatchInternal,
    ensureVisState: ensureVisState,
    ensureOpSeq: ensureOpSeq,
    isStaleOpSeq: isStaleOpSeq,
    warnDisposed: warnDisposed,
    cloneVisState: cloneVisState
  };
});

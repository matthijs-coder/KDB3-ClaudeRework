define([
  "./state.js",
  "./selectors.js",
  "./bindingConfig.js",
  "./runtime.js",
  "./settingsSnapshot.js"
], function (_state, _selectors, _bindingConfig, _runtime, _settingsSnapshot) {
  "use strict";

  function buildContext(_instance) {
    return {
      _KDB: _instance._KDB,
      selectors: _instance.selectors,
      actionTypes: _state.ACTION_TYPES,
      dispatchInternal: _instance.dispatchInternal,
      isDisposed: _instance.isDisposed === true,
      ensureOpSeq: ensureOpSeq.bind(null, _instance),
      isStaleOpSeq: isStaleOpSeq.bind(null, _instance),
      readMetric: readMetric.bind(null, _instance),
      readSettingsSnapshot: readSettingsSnapshot.bind(null, _instance)
    };
  }

  function createDetachedContext(_KDB) {
    ensureVisState(_KDB);
    var instance = {
      _KDB: _KDB,
      selectors: _selectors,
      reducer: _state.createWidgetVisReducer(),
      isDisposed: false
    };
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
    if (typeof _opSeq !== "number") {
      return false;
    }
    var runtime = _runtime.readWidgetRuntime(_instance._KDB, _widgetId);
    // The runtime is deleted when the widget is parked, removed or its tab is deleted: any operation still running is stale.
    return !runtime || runtime.opSeq !== _opSeq;
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
    isStaleOpSeq: isStaleOpSeq
  };
});

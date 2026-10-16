define([
  "./state/createMetricsTreeReducer.js", "./state/selectors.js", "./state/resolveMetricByCode.js",
  "./view/cleanupMetricsTrees.js", "./effects/runMetricsTreeMount.js",
  "./runtime/ensureMetricsTreeRuntime.js", "./runtime/clearMetricsTreeRuntime.js"
], function (_createMetricsTreeReducer, _selectors, _resolveMetricByCode, _cleanupMetricsTrees, _runMetricsTreeMount, _ensureMetricsTreeRuntime, _clearMetricsTreeRuntime) {
  "use strict";

  function createMetricsTreeController(_deps) {
    const instance = {
      _KDB: _deps._KDB,
      options: _deps.options || {},
      reducer: _createMetricsTreeReducer(),
      isDisposed: false,
      didWarnDisposed: false
    };
    instance.api = {
      mount: mount.bind(null, instance),
      destroy: destroy.bind(null, instance),
      dispatch: dispatch.bind(null, instance),
      getState: getState.bind(null, instance),
      resolveMetricByCode: resolveMetricByCode.bind(null, instance)
    };
    return instance.api;
  }

  function mount(instance, _options) {
    if (instance.isDisposed) {
      warnDisposed(instance, "mount");
      return Promise.resolve(false);
    }
    try {
      return _runMetricsTreeMount(instance, _options);
    } catch (err) {
      return Promise.resolve(_runMetricsTreeMount.handleMountError(instance, err));
    }
  }

  function destroy(instance) {
    if (instance.isDisposed) { return; }
    try {
      const runtime = _ensureMetricsTreeRuntime(instance._KDB);
      instance.isDisposed = true;
      abortControllers(runtime.abortControllers);
      _cleanupMetricsTrees(instance._KDB);
      _clearMetricsTreeRuntime(runtime);
      dispatch(instance, { type: "metricsTree/destroy" });
    } catch (err) {
      instance.isDisposed = true;
      console.error("[metricsTree.destroy] destroy failed", err);
    }
  }

  function dispatch(instance, _action) {
    if (instance.isDisposed && (!_action || _action.type !== "metricsTree/destroy")) {
      warnDisposed(instance, "dispatch");
      return;
    }
    const currentState = instance._KDB.state.metricsTree;
    instance._KDB.state.metricsTree = instance.reducer(currentState, stampDispatchTimestamps(_action));
  }

  function getState(instance) {
    if (instance.isDisposed) { return undefined; }
    return _selectors.readMetricsTreeState(instance._KDB);
  }

  function resolveMetricByCode(instance, code) {
    return _resolveMetricByCode.resolveMetricByCode(instance._KDB, code);
  }

  function stampDispatchTimestamps(_action) {
    if (!_action) { return _action; }
    if (_action.type === "metricsTree/loadSucceeded") {
      const payload = _action.payload || {};
      return { type: _action.type, payload: Object.assign({}, payload, { lastBuildAt: Date.now() }) };
    }
    if (_action.type === "metricsTree/rendered") {
      const payload = _action.payload || {};
      return { type: _action.type, payload: Object.assign({}, payload, { lastRenderedAt: Date.now(), readyResolvedAt: Date.now() }) };
    }
    return _action;
  }

  function warnDisposed(instance, methodName) {
    if (instance.didWarnDisposed) { return; }
    instance.didWarnDisposed = true;
    console.warn("[metricsTree." + methodName + "] called after destroy");
  }

  function abortControllers(abortControllersByKey) {
    const keys = Object.keys(abortControllersByKey || {});
    for (let index = 0; index < keys.length; index += 1) { abortControllersByKey[keys[index]].abort(); }
  }

  return createMetricsTreeController;
});

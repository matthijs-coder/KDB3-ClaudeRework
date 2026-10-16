define([
  "./state.js",
  "./config.js",
  "./effects.js",
  "./view.js",
  "./metricLookup.js",
  "../../core/utils/kit/runtime.js",
  "../../core/utils/kit/errors.js"
], function (_state, _config, _effects, _view, _metricLookup, _runtimeKit, _errorsKit) {
  "use strict";

  // Lifecycle terms for metricsTree:
  //   idle, loading, ready, error, disposed.
  function registerMetricsTree(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    if (!_KDB.elements.selectors.metricsTree) {
      _KDB.elements.selectors.metricsTree = _config.DOM_SELECTORS;
    }
    if (!_KDB.state.metricsTree) {
      _KDB.state.metricsTree = _state.createInitialMetricsTreeState();
    }
    const runtime = _runtimeKit.ensureRuntime(_KDB, "metricsTree");
    const guard = _errorsKit.createDisposedGuard("metricsTree");
    const instance = { _KDB: _KDB, api: null, isDisposed: guard.isDisposed };

    function reduce(action) {
      _KDB.state.metricsTree = _state.reduceMetricsTreeState(_KDB.state.metricsTree, action);
    }

    function mount() {
      if (guard.blocked("mount")) { return Promise.resolve(false); }
      try {
        return _effects.mountMetricsTree(instance);
      } catch (err) {
        return Promise.resolve(_effects.handleMountError(instance, err));
      }
    }

    function destroy() {
      if (guard.isDisposed()) { return; }
      guard.dispose();
      try {
        _view.cleanupMetricsTrees(_KDB);
        _runtimeKit.disposeRuntimeBuckets(runtime).forEach(function (err) {
          console.error("[metricsTree.destroy] release failed", err);
        });
        delete runtime.metricIndex;
        reduce({ type: _state.ACTIONS.DESTROY });
      } catch (err) {
        console.error("[metricsTree.destroy] destroy failed", err);
      }
    }

    function dispatch(action) {
      if (guard.isDisposed() && (!action || action.type !== _state.ACTIONS.DESTROY)) {
        guard.blocked("dispatch");
        return;
      }
      reduce(action);
    }

    function getState() {
      return guard.isDisposed() ? undefined : _KDB.state.metricsTree;
    }

    function resolveMetricByCode(code) {
      return _metricLookup.resolveMetricByCode(_KDB, code);
    }

    instance.api = {
      mount: mount,
      destroy: destroy,
      dispatch: dispatch,
      getState: getState,
      resolveMetricByCode: resolveMetricByCode
    };
    _KDB.api.metricsTree = instance.api;
    return instance.api;
  }

  return registerMetricsTree;
});

define([
  "./state/initialState.js",
  "./config/domSelectors.js",
  "../../core/libraries/jstree.min.js",
  "./createMetricsTreeController.js"
], function (_initialState, _domSelectors, _jstree, _createMetricsTreeController) {
  "use strict";

  // Lifecycle terms for metricsTree:
  //   idle, loading, ready, error, disposed.
  function __orchestrator(_KDB, _options) {
    ensureKdbNamespaces(_KDB);
    ensureSelectors(_KDB);
    ensureState(_KDB);
    ensureRuntime(_KDB);

    const controller = _createMetricsTreeController({
      _KDB: _KDB,
      options: _options || {}
    });

    _KDB.api.metricsTree = controller;
    return controller;
  }

  function ensureKdbNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
  }

  function ensureSelectors(_KDB) {
    if (!_KDB.elements.selectors.metricsTree) {
      _KDB.elements.selectors.metricsTree = _domSelectors;
    }
  }

  function ensureState(_KDB) {
    if (!_KDB.state.metricsTree) {
      _KDB.state.metricsTree = _initialState();
    }
  }

  function ensureRuntime(_KDB) {
    const runtime = _KDB.runtime.metricsTree || {};
    runtime.domRefs = runtime.domRefs || {};
    runtime.listeners = runtime.listeners || {};
    runtime.subscriptions = runtime.subscriptions || {};
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.adapters = runtime.adapters || {};
    _KDB.runtime.metricsTree = runtime;
  }

  return __orchestrator;
});

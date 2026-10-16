define([
  "./state/initialState.js",
  "./config/selectors.js",
  "./createFilterDockController.js"
], function (_initialState, _selectorConfig, _createFilterDockController) {
  "use strict";

  // Lifecycle terms for filterDock: idle, ready, error, disposed.

  function mergeSelectorConfig(_target, _source) {
    var key;
    for (key in _source) {
      if (Object.prototype.hasOwnProperty.call(_source, key) && _target[key] === undefined) {
        _target[key] = _source[key];
      }
    }
    return _target;
  }

  function registerSelectors(_KDB) {
    _KDB.elements.selectors.filterDock = mergeSelectorConfig(
      _KDB.elements.selectors.filterDock || {},
      _selectorConfig
    );
  }

  function __orchestrator(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};

    if (!_KDB.state.filters.filterDock) {
      _KDB.state.filters.filterDock = _initialState();
    }

    _KDB.runtime.filterDock = _KDB.runtime.filterDock || {
      domRefs: {},
      listeners: {},
      subscriptions: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {}
    };

    registerSelectors(_KDB);

    var controller = _createFilterDockController({ _KDB: _KDB, options: _options || {} });
    _KDB.api.filterDock = controller;
    return controller;
  }

  return __orchestrator;
});

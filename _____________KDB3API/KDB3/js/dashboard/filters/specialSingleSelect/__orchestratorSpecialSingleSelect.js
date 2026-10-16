define([
  "./state/initialState.js",
  "./config/selectors.js",
  "./createSpecialSingleSelectController.js",
  "./runtime/ensureSpecialSingleSelectRuntime.js",
  "./effects/subscribeTableDataChanges.js"
], function (
  _initialState,
  _selectorConfig,
  _createSpecialSingleSelectController,
  _ensureSpecialSingleSelectRuntime,
  _subscribeTableDataChanges
) {
  "use strict";

  // Lifecycle terms for specialSingleSelect: idle, ready, error, disposed.

  function __orchestrator(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    _KDB.elements.selectors.specialSingleSelect = _selectorConfig;

    if (!_KDB.state.filters.specialSingleSelect) {
      _KDB.state.filters.specialSingleSelect = _initialState();
    }

    var runtime = _ensureSpecialSingleSelectRuntime(_KDB);

    var controller = _createSpecialSingleSelectController({ _KDB: _KDB, options: _options || {} });
    _KDB.api.specialSingleSelect = controller;
    if (typeof runtime.subscriptions.tableDataLoadFinished === "function") {
      runtime.subscriptions.tableDataLoadFinished();
    }
    runtime.subscriptions.tableDataLoadFinished = _subscribeTableDataChanges(_KDB, controller);
    return controller;
  }

  return __orchestrator;
});

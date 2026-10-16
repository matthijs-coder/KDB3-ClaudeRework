define([
  "./state/initialState.js",
  "./config/selectors.js",
  "./createSichtController.js",
  "./effects/ensureSichtRuntime.js",
  "./effects/subscribeTableDataChanges.js",
  "./history/createSichtHistoryReplayHandler.js"
], function (
  _initialState,
  _selectorConfig,
  _createSichtController,
  _ensureSichtRuntime,
  _subscribeTableDataChanges,
  _createHandler
) {
  "use strict";

  // Lifecycle terms for sicht: idle, ready, error, disposed.

  function stageSichtHistoryReplayHandler(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.sicht;
    if (!rt) {
      return null;
    }
    var handler = _createHandler(_KDB);
    rt.historyReplayHandlerContribution = handler;
    return handler;
  }

  function __orchestrator(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    _KDB.elements.selectors.sicht = _selectorConfig;

    if (!_KDB.state.filters.sicht) {
      _KDB.state.filters.sicht = _initialState();
    }

    var runtime = _ensureSichtRuntime(_KDB);
    stageSichtHistoryReplayHandler(_KDB);
    var controller = _createSichtController({ _KDB: _KDB, options: _options || {} });
    _KDB.api.sicht = controller;
    if (typeof runtime.subscriptions.tableDataLoadFinished === "function") {
      runtime.subscriptions.tableDataLoadFinished();
    }
    runtime.subscriptions.tableDataLoadFinished = _subscribeTableDataChanges(_KDB, controller);
    return controller;
  }

  return __orchestrator;
});

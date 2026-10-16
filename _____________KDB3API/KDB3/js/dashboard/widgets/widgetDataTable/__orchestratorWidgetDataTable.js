define([
  "./createWidgetDataTableController.js",
  "./state/initialState.js",
  "./runtime/initializeRuntime.js"
], function (_createWidgetDataTableController, _initialState, _initializeRuntime) {
  // Lifecycle terms for widgetDataTable:
  //   idle, ready, error, disposed.
  function __orchestrator(_KDB, _options) {
    try {
      ensureNamespaces(_KDB);
      initializeState(_KDB);
      _initializeRuntime(_KDB);
      const controller = _createWidgetDataTableController({ _KDB: _KDB, options: _options || {} });
      _KDB.api.widgetDataTable = controller;
      return controller;
    } catch (err) {
      console.error("[widgetDataTable.__orchestrator] failed", err);
      throw err;
    }
  }
  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
  }
  function initializeState(_KDB) {
    if (!_KDB.state.widgets.dataTable) {
      _KDB.state.widgets.dataTable = _initialState();
    }
  }
  return __orchestrator;
});

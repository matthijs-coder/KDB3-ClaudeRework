define([
  "./createWidgetVisController.js",
  "./state/selectors.js"
], function (_createWidgetVisController, _selectors) {
  "use strict";
  // Lifecycle terms for widgetVis:
  //   idle, ready, error, disposed.
  function readCognosHostService(_KDB) {
    return _KDB.services && _KDB.services.cognosHost ? _KDB.services.cognosHost : null;
  }

  function stampHostFacets(_KDB) {
    var service = readCognosHostService(_KDB);
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.widgetVis = _KDB.runtime.widgetVis || {};
    _KDB.runtime.widgetVis.visualizationFacet = service && service.visualization ? service.visualization : null;
    _KDB.runtime.widgetVis.widgetsFacet = service && service.widgets ? service.widgets : null;
    _KDB.runtime.widgetVis.filtersFacet = service && service.filters ? service.filters : null;
    _KDB.runtime.widgetVis.drillthroughService = _KDB.services && _KDB.services.drillthrough ? _KDB.services.drillthrough : null;
    _KDB.runtime.widgetVis.tableDataReadRows = _KDB.services && _KDB.services.tableData && typeof _KDB.services.tableData.readRows === "function" ? _KDB.services.tableData.readRows.bind(_KDB.services.tableData) : null;
    _KDB.runtime.widgetVis.dataQueryFacet = service && service.dataQuery ? service.dataQuery : null;
  }

  function __orchestrator(_KDB, _options) {
    try {
      ensureNamespaces(_KDB);
      stampHostFacets(_KDB);
      var controller = _createWidgetVisController({ _KDB: _KDB, options: _options || {}, selectors: _selectors });
      _KDB.api.widgetVis = controller;
      return controller;
    } catch (err) {
      console.error("[widgetVis.__orchestrator] failed", err);
      throw err;
    }
  }
  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
  }
  return __orchestrator;
});

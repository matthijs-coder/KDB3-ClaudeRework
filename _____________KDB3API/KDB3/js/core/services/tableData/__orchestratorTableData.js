define([
  "./createTableDataService.js",
  "./operations/registerConfiguredLoadsOnStartup.js",
], function (_createTableDataService, _registerConfiguredLoadsOnStartup) {
  "use strict";

  // Lifecycle terms for tableDataService:
  //   idle, loading, ready, error, disposed.
  // Freshness terms: fresh, stale (separate field).
  function __orchestrator(_KDB) {
    try {
      _KDB.services = _KDB.services || {};
      _KDB.state = _KDB.state || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.state.tableData = _KDB.state.tableData || {};
      _KDB.runtime.tableData = _KDB.runtime.tableData || {};
      _KDB.runtime.tableData.pendingLoads = _KDB.runtime.tableData.pendingLoads || {};
      _KDB.runtime.tableData.abortControllers = _KDB.runtime.tableData.abortControllers || {};
      _KDB.runtime.tableData.subscriptions = _KDB.runtime.tableData.subscriptions || {};
      _KDB.runtime.tableData.timers = _KDB.runtime.tableData.timers || {};
      _KDB.runtime.tableData.notifiedLoadFailures = _KDB.runtime.tableData.notifiedLoadFailures || {};
      _KDB.runtime.tableData.loadRegistryReady = Promise.resolve([]);
      _KDB.runtime.tableData.loadRegistryReadyResolve = null;
      _KDB.runtime.tableData.loadRegistryKeys = [];
      _KDB.runtime.tableData.canvasWidgetsForLookup = null;
      _KDB.runtime.tableData.canvasWidgetsForLookupPromise = null;
      stampHostFacets(_KDB);
      _KDB.services.tableData = _createTableDataService(_KDB);
      _registerConfiguredLoadsOnStartup(_KDB);
      return _KDB.services.tableData;
    } catch (error) {
      console.error("[tableDataService.__orchestrator] service startup failed", error);
      throw error;
    }
  }

  function readCanvasFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.canvas ? service.canvas : null;
  }

  function readDataQueryFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.dataQuery ? service.dataQuery : null;
  }

  function readVisualizationFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.visualization ? service.visualization : null;
  }

  function readWidgetsFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.widgets ? service.widgets : null;
  }

  function stampHostFacets(_KDB) {
    _KDB.runtime.tableData = _KDB.runtime.tableData || {};
    _KDB.runtime.tableData.canvasFacet = readCanvasFacet(_KDB);
    _KDB.runtime.tableData.dataQueryFacet = readDataQueryFacet(_KDB);
    _KDB.runtime.tableData.visualizationFacet = readVisualizationFacet(_KDB);
    _KDB.runtime.tableData.widgetsFacet = readWidgetsFacet(_KDB);
  }

  return __orchestrator;
});

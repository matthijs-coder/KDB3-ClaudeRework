define([
  "./createDrillthroughService.js",
  "./config.js"
], function (_createDrillthroughService, _config) {
  "use strict";

  function __orchestrator(_KDB, _options) {
    try {
      var tableData;
      var existing;
      var readRows;
      var readPendingLoad;
      var readTableState;
      var service;
      _KDB.services = _KDB.services || {};
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
      existing = _KDB.config.labels.de.drillthrough && typeof _KDB.config.labels.de.drillthrough === "object"
        ? _KDB.config.labels.de.drillthrough
        : {};
      _KDB.config.labels.de.drillthrough = Object.assign({}, _config.drillthroughLabels, existing);
      tableData = _KDB.services.tableData;
      readRows = tableData && typeof tableData.readRows === "function"
        ? tableData.readRows.bind(tableData)
        : null;
      readPendingLoad = tableData && typeof tableData.readPendingLoad === "function"
        ? tableData.readPendingLoad.bind(tableData)
        : null;
      readTableState = tableData && typeof tableData.readTableState === "function"
        ? tableData.readTableState.bind(tableData)
        : null;
      service = _createDrillthroughService({
        links: _KDB.config && _KDB.config.links ? _KDB.config.links : null,
        readRows: readRows,
        readPendingLoad: readPendingLoad,
        readTableState: readTableState,
        labels: _KDB.config.labels.de.drillthrough
      });
      _KDB.services.drillthrough = service;
      return service;
    } catch (error) {
      console.error("[drillthrough.__orchestrator] service startup failed", error);
      throw error;
    }
  }

  return __orchestrator;
});

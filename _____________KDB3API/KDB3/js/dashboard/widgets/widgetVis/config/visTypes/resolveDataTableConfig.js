define([
  "./readVisualizationsConfig.js",
  "./resolveMetricsDataSource.js",
  "./resolveSortingConfig.js"
], function (_readVisualizationsConfig, _resolveMetricsDataSource, _resolveSortingConfig) {
  "use strict";

  function resolveVisualizationDimensions(_KDB) {
    var visConfig = _readVisualizationsConfig(_KDB);
    return visConfig.dimensions || {};
  }

  function resolveDataTableConfig(_kennzahlenTable, _KDB, _visualizationType) {
    var defaultTable = _resolveMetricsDataSource(_KDB);
    var table = _kennzahlenTable || defaultTable;
    var visConfig = _readVisualizationsConfig(_KDB);
    var bindingSpecs = visConfig.bindingSpecs || {};
    var byTable = bindingSpecs.dataTableByKennzahlenTable || {};
    var tableConfig = byTable[table] || byTable[defaultTable] || {};
    return {
      datasourceName: tableConfig.datasourceName,
      sorting: _resolveSortingConfig(_visualizationType, _KDB, tableConfig),
      dimensions: resolveVisualizationDimensions(_KDB)
    };
  }

  return {
    resolveVisualizationDimensions: resolveVisualizationDimensions,
    resolveDataTableConfig: resolveDataTableConfig
  };
});

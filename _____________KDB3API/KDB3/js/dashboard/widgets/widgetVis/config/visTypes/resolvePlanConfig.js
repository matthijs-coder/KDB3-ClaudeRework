define([
  "./readVisualizationsConfig.js",
  "./resolveMetricsDataSource.js",
  "../../../../../core/config/mapping/parameterMap.js"
], function (_readVisualizationsConfig, _resolveMetricsDataSource, _parameterMap) {
  "use strict";

  function resolveEmptyDataFilter(_KDB) {
    var bindingSpecs = _readVisualizationsConfig(_KDB).bindingSpecs || {};
    return bindingSpecs.emptyDataFilter || { itemId: null, value: "1" };
  }

  function resolveTopNOptions(_KDB) {
    var definitions = _readVisualizationsConfig(_KDB).definitions || {};
    return definitions.topNOptions || { default: 0 };
  }

  function resolvePlanConfigSnapshots(_KDB) {
    var properties = (_KDB && _KDB.properties) || {};
    return {
      filterPropObj: properties.filterPropObj || {},
      parameterMappingObj: _parameterMap || {},
      topNOptions: resolveTopNOptions(_KDB),
      emptyDataFilter: resolveEmptyDataFilter(_KDB)
    };
  }

  function resolveDatasourceIdentity(_parameterMappingObj, _dataTableConfig, _kennzahlenTable, _hints, _KDB) {
    var mapping = _parameterMappingObj || {};
    var tableConfig = _dataTableConfig || {};
    var table = _kennzahlenTable || _resolveMetricsDataSource(_KDB);
    var hints = _hints || {};
    var datasourceId = hints.datasourceId || null;
    if (!datasourceId && mapping.widget_datasource_id_KID) {
      datasourceId = String(mapping.widget_datasource_id_KID);
    }
    var datasourceName = hints.datasourceName != null ? String(hints.datasourceName) : null;
    if (!datasourceName && tableConfig.datasourceName) {
      datasourceName = String(tableConfig.datasourceName);
    }
    if (!datasourceName && mapping.widget_datasource_name_KID) {
      datasourceName = String(mapping.widget_datasource_name_KID);
    }
    if (!datasourceName && mapping.datasource_name_KID) {
      datasourceName = String(mapping.datasource_name_KID);
    }
    if (!datasourceName && table) {
      datasourceName = String(table);
    }
    return {
      datasourceId: datasourceId,
      datasourceName: datasourceName
    };
  }

  return {
    resolveEmptyDataFilter: resolveEmptyDataFilter,
    resolvePlanConfigSnapshots: resolvePlanConfigSnapshots,
    resolveDatasourceIdentity: resolveDatasourceIdentity
  };
});

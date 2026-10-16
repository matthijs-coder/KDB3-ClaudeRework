define([
  "./visTypes.js",
  "./config/visualizations/sorting.js",
  "../../../core/config/mapping/parameterMap.js",
  "./config/visualizations/topNHelper.js"
], function (_visTypes, _visSorting, _parameterMap, _topNHelperConfig) {
  "use strict";

  function readSortingByProfile(_KDB) {
    var visConfig = _visTypes.readVisualizationsConfig(_KDB);
    return visConfig.sortingByProfile || _visSorting.sortingByProfile || {};
  }

  function resolveSortingProfileKey(_visualizationType, _KDB) {
    var bucket = _visTypes.resolveVisPropBucketKey(_visualizationType, _KDB);
    if (bucket === "Line") {
      return "line";
    }
    if (bucket === "List") {
      return "list";
    }
    if (bucket === "com.ibm.vis.custom.prognoseyearlinechart") {
      return "prognose";
    }
    return null;
  }

  function resolveSortingConfig(_visualizationType, _KDB, _tableConfig) {
    var tableConfig = _tableConfig || {};
    var visConfig = _visTypes.readVisualizationsConfig(_KDB);
    var profileKey = resolveSortingProfileKey(_visualizationType, _KDB);
    var sortingByProfile = readSortingByProfile(_KDB);
    if (profileKey && sortingByProfile[profileKey]) {
      return sortingByProfile[profileKey];
    }
    return visConfig.sorting || tableConfig.sorting || {};
  }

  function resolveVisualizationDimensions(_KDB) {
    var visConfig = _visTypes.readVisualizationsConfig(_KDB);
    return visConfig.dimensions || {};
  }

  function resolveDataTableConfig(_kennzahlenTable, _KDB, _visualizationType) {
    var defaultTable = _visTypes.resolveCurrentMetricsDataSource(_KDB);
    var table = _kennzahlenTable || defaultTable;
    var visConfig = _visTypes.readVisualizationsConfig(_KDB);
    var bindingSpecs = visConfig.bindingSpecs || {};
    var byTable = bindingSpecs.dataTableByKennzahlenTable || {};
    var tableConfig = byTable[table] || byTable[defaultTable] || {};
    return {
      datasourceName: tableConfig.datasourceName,
      sorting: resolveSortingConfig(_visualizationType, _KDB, tableConfig),
      dimensions: resolveVisualizationDimensions(_KDB)
    };
  }

  function resolveEmptyDataFilter(_KDB) {
    var bindingSpecs = _visTypes.readVisualizationsConfig(_KDB).bindingSpecs || {};
    return bindingSpecs.emptyDataFilter || { itemId: null, value: "1" };
  }

  function resolveTopNOptions(_KDB) {
    var definitions = _visTypes.readVisualizationsConfig(_KDB).definitions || {};
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
    var table = _kennzahlenTable || _visTypes.resolveCurrentMetricsDataSource(_KDB);
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

  function resolveBindingContext(_KDB, _options) {
    var options = _options || {};
    var metricsTable = options.kennzahlenTable || _visTypes.resolveCurrentMetricsDataSource(_KDB);
    var visualizationType = options.visualizationType
      || _visTypes.resolveDefaultVisualizationType(_KDB);
    var planSnapshots = resolvePlanConfigSnapshots(_KDB);
    var dataTableConfig = resolveDataTableConfig(metricsTable, _KDB, visualizationType);
    var visTypeConfig = _visTypes.resolveVisTypeConfig(metricsTable, visualizationType, _KDB);
    return {
      planSnapshots: planSnapshots,
      dataTableConfig: dataTableConfig,
      visTypeConfig: visTypeConfig,
      kennzahlDefaults: _visTypes.resolveKennzahlDefaults(options.kennzahlCode, _KDB),
      visPropBucketKey: _visTypes.resolveVisPropBucketKey(visualizationType, _KDB),
      cognosVisualizationTypeId: _visTypes.resolveCognosVisualizationTypeId(visualizationType, _KDB),
      normalizedVisualizationType: _visTypes.normalizeVisualizationType(visualizationType) || visualizationType,
      datasourceIdentity: resolveDatasourceIdentity(
        planSnapshots.parameterMappingObj,
        dataTableConfig,
        metricsTable,
        options.datasourceHints || {},
        _KDB
      )
    };
  }

  function readTopNItemId(_visibleDimension) {
    if (_visibleDimension.topNItemId) {
      return String(_visibleDimension.topNItemId);
    }
    if (_visibleDimension.exclude && _visibleDimension.exclude.itemId) {
      return String(_visibleDimension.exclude.itemId);
    }
    return null;
  }

  function resolveTopNHelperListConfig(_KDB, _dataConfig) {
    var dataConfig = _dataConfig || {};
    var visConfig = (_KDB && _KDB.config && _KDB.config.visualizations) || {};
    var helperRoot = Object.assign({}, _topNHelperConfig, visConfig.topNHelper || {});
    var tableEntry = helperRoot.resolveTableEntry(dataConfig.kennzahlenTable);
    if (!tableEntry || !tableEntry.valueColumnId) {
      return null;
    }
    if (!dataConfig.dimension) {
      return null;
    }
    var dimensions = dataConfig.dataTableConfig && dataConfig.dataTableConfig.dimensions
      ? dataConfig.dataTableConfig.dimensions
      : {};
    var visibleDimension = dimensions[dataConfig.dimension];
    if (!visibleDimension || !readTopNItemId(visibleDimension)) {
      return null;
    }
    return {
      visualizationType: helperRoot.visualizationType || "List",
      cognosVisualizationTypeId: helperRoot.cognosVisualizationTypeId || "List",
      visPropBucketKey: helperRoot.visPropBucketKey || "List",
      topNHelperConfigSource: "core/config/visualizations/topNHelper.js"
    };
  }

  return {
    resolveBindingContext: resolveBindingContext,
    resolveVisualizationDimensions: resolveVisualizationDimensions,
    resolveDataTableConfig: resolveDataTableConfig,
    resolveSortingConfig: resolveSortingConfig,
    resolvePlanConfigSnapshots: resolvePlanConfigSnapshots,
    resolveDatasourceIdentity: resolveDatasourceIdentity,
    resolveEmptyDataFilter: resolveEmptyDataFilter,
    resolveTopNHelperListConfig: resolveTopNHelperListConfig,
    resolveCurrentMetricsDataSource: _visTypes.resolveCurrentMetricsDataSource
  };
});

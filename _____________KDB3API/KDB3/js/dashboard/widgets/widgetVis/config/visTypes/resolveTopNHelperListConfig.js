define([
  "../../../../../core/config/visualizations/topNHelper.js"
], function (_topNHelperConfig) {
  "use strict";

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

  return resolveTopNHelperListConfig;
});

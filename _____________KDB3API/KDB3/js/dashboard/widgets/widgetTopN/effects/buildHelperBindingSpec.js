define([
  "../state/cloneSerializable.js",
  "../../../../core/config/visualizations/topNHelper.js"
], function (_cloneSerializable, _topNHelperConfig) {
  "use strict";
  function __controller(_context) {
    var context = _context || {};
    try {
      var dataConfig = buildHelperDataConfig(context);
      if (dataConfig.errorCode) { return dataConfig; }
      logHelperSpec(context, dataConfig);
      return {
        ok: true,
        spec: {
          reason: "topN",
          targetKind: "topNHelper",
          widgetId: context.helperWidgetId,
          ownerWidgetId: context.ownerVisId,
          opSeq: context.opSeq,
          dataConfig: dataConfig,
          hierarchySnapshot: _cloneSerializable(context.hierarchySnapshot || null),
          helperTableResult: null,
          resetIntent: { enabled: true, scope: "helperTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "topNHelperPreApply" },
          emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
          config: _cloneSerializable(context.config || {}),
          diagnostics: { helperBindingMode: "topNHelperConfig" }
        }
      };
    } catch (err) {
      console.error("[widgetTopN.buildHelperBindingSpec] failed", { ownerVisId: _context && _context.ownerVisId }, err);
      return failure("WIDGET_TOPN_HELPER_PLAN_FAILED", err && err.message);
    }
  }

  function buildHelperDataConfig(context) {
    var source = context.dataConfig || {};
    var tableConfig = source.dataTableConfig || {};
    var helper = _topNHelperConfig;
    var table = helper.resolveTableEntry(source.kennzahlenTable);
    var dimensionKey = source.dimension == null ? "" : String(source.dimension);
    var visibleDimension = tableConfig.dimensions && tableConfig.dimensions[dimensionKey];
    var topNItemId = visibleDimension && (visibleDimension.topNItemId || (visibleDimension.exclude && visibleDimension.exclude.itemId));
    var aggregation = helper.aggregationFilter || {};
    var jahrFilterValue = readJahrFilterValue(context, source);
    var monatFilterValue = readMonatFilterValue(context, source);
    var widgetFilter = {};
    var dimensions = {};
    var excludeRule = visibleDimension && visibleDimension.exclude || {};
    var excludeValues = Array.isArray(excludeRule.values) && excludeRule.values.length
      ? excludeRule.values.slice()
      : (helper.dimensionExcludeDefaults || ["Gesamt", "ALLE", "^"]).slice();

    if (!source.datasourceId || !dimensionKey || !visibleDimension || !topNItemId || !table || !table.valueColumnId) {
      return failure("WIDGET_TOPN_INVALID_REQUEST", "Missing TopN helper binding metadata.");
    }
    if (aggregation.key && aggregation.include && aggregation.include.length) {
      widgetFilter[aggregation.key] = { include: aggregation.include.slice() };
    }
    if (table.jahrColumnId && jahrFilterValue) {
      widgetFilter[table.jahrColumnId] = { include: [jahrFilterValue] };
    }
    if (table.monatColumnId && monatFilterValue) {
      widgetFilter[table.monatColumnId] = { include: [monatFilterValue] };
    }
    dimensions[dimensionKey] = {
      itemId: String(topNItemId),
      exclude: { itemId: String(topNItemId), values: excludeValues }
    };

    return {
      kennzahlCode: source.kennzahlCode || "",
      kennzahlenTable: source.kennzahlenTable || null,
      datasourceId: source.datasourceId,
      datasourceName: source.datasourceName == null ? null : String(source.datasourceName),
      visualizationType: helper.visualizationType || "List",
      cognosVisualizationTypeId: helper.cognosVisualizationTypeId || "List",
      visPropBucketKey: helper.visPropBucketKey || "List",
      visTypeConfig: {
        values: "",
        categories: "",
        series: "",
        color: "",
        repeatHorizontal: "",
        repeatVertical: "",
        grid_cols: [String(topNItemId), table.valueColumnId].filter(Boolean),
        dimensionSelectionAffects: "disabled",
        widgetFilter: widgetFilter
      },
      dataTableConfig: {
        datasourceName: tableConfig.datasourceName || source.datasourceName || source.kennzahlenTable || null,
        dimensions: dimensions,
        sorting: {}
      },
      dimension: dimensionKey,
      topN: context.topNChoice
    };
  }

  function logHelperSpec(context, dataConfig) {
    try {
      var vis = dataConfig.visTypeConfig || {};
      var snapshot = context.hierarchySnapshot || {};
      var resolution = snapshot.resolution || {};
      console.info("[sicht-jahr] TEMP helperSpec", {
        ownerVisId: context.ownerVisId,
        helperWidgetId: context.helperWidgetId,
        dimension: dataConfig.dimension,
        topN: dataConfig.topN,
        kennzahlCode: dataConfig.kennzahlCode,
        activeDownstream: snapshot.activeDownstreamName || resolution.activeFilterKey || null,
        gridCols: vis.grid_cols,
        widgetFilter: vis.widgetFilter
      });
    } catch (err) {
      console.info("[widgetTopN.helperSpec] TEMP filters failed", err);
    }
  }

  function failure(errorCode, errorMessage) {
    return { ok: false, errorCode: errorCode, errorMessage: errorMessage };
  }

  function readJahrFilterValue(context, source) {
    return context.jahrFilterValue || context.yearFilterValue || source.jahrFilterValue || source.yearFilterValue ||
      (context.config && (context.config.jahrFilterValue || context.config.yearFilterValue)) || null;
  }

  function readMonatFilterValue(context, source) {
    return context.monatFilterValue || source.monatFilterValue ||
      (context.config && context.config.monatFilterValue) || null;
  }

  return __controller;
});

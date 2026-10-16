define([
  "./config.js",
  "../../../core/config/visualizations/topNHelper.js",
  "../../../core/utils/kit/data.js"
], function (_config, _topNHelperConfig, _data) {
  "use strict";

  // The spec reads the owner's foreign dataConfig and the topNHelper config; a
  // throw here must still end in a terminal TopN error for the owner, so it is
  // converted to WIDGET_TOPN_HELPER_PLAN_FAILED.
  function buildTopNSpec(_context) {
    var context = _context || {};
    try {
      var dataConfig = buildHelperDataConfig(context);
      if (dataConfig.errorCode) {
        return dataConfig;
      }
      return {
        ok: true,
        spec: {
          reason: "topN",
          targetKind: "topNHelper",
          widgetId: context.helperWidgetId,
          ownerWidgetId: context.ownerVisId,
          opSeq: context.opSeq,
          dataConfig: dataConfig,
          hierarchySnapshot: _data.cloneJson(context.hierarchySnapshot || null),
          helperTableResult: null,
          resetIntent: { enabled: true, scope: "helperTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "topNHelperPreApply" },
          emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
          config: _data.cloneJson(context.config || {}),
          diagnostics: { helperBindingMode: "topNHelperConfig" }
        }
      };
    } catch (err) {
      console.error("[widgetTopN.buildHelperBindingSpec] failed", { ownerVisId: context.ownerVisId }, err);
      return specFailure("WIDGET_TOPN_HELPER_PLAN_FAILED", err && err.message);
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
    if (!source.datasourceId || !dimensionKey || !visibleDimension || !topNItemId || !table || !table.valueColumnId) {
      return specFailure("WIDGET_TOPN_INVALID_REQUEST", "Missing TopN helper binding metadata.");
    }
    var dimensions = {};
    dimensions[dimensionKey] = {
      itemId: String(topNItemId),
      exclude: { itemId: String(topNItemId), values: readExcludeValues(helper, visibleDimension) }
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
        widgetFilter: buildWidgetFilter(helper, table, context, source)
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

  function readExcludeValues(helper, visibleDimension) {
    var excludeRule = visibleDimension.exclude || {};
    if (Array.isArray(excludeRule.values) && excludeRule.values.length) {
      return excludeRule.values.slice();
    }
    return (helper.dimensionExcludeDefaults || _config.DEFAULT_EXCLUDE_VALUES).slice();
  }

  function buildWidgetFilter(helper, table, context, source) {
    var aggregation = helper.aggregationFilter || {};
    var jahrFilterValue = readJahrFilterValue(context, source);
    var monatFilterValue = readMonatFilterValue(context, source);
    var widgetFilter = {};
    if (aggregation.key && aggregation.include && aggregation.include.length) {
      widgetFilter[aggregation.key] = { include: aggregation.include.slice() };
    }
    if (table.jahrColumnId && jahrFilterValue) {
      widgetFilter[table.jahrColumnId] = { include: [jahrFilterValue] };
    }
    if (table.monatColumnId && monatFilterValue) {
      widgetFilter[table.monatColumnId] = { include: [monatFilterValue] };
    }
    return widgetFilter;
  }

  function readJahrFilterValue(context, source) {
    return context.jahrFilterValue || context.yearFilterValue || source.jahrFilterValue || source.yearFilterValue ||
      (context.config && (context.config.jahrFilterValue || context.config.yearFilterValue)) || null;
  }

  function readMonatFilterValue(context, source) {
    return context.monatFilterValue || source.monatFilterValue ||
      (context.config && context.config.monatFilterValue) || null;
  }

  function buildCleanupSpec(_context) {
    return {
      reason: "cleanup",
      targetKind: "topNHelper",
      widgetId: _context.helperWidgetId,
      ownerWidgetId: _context.ownerVisId,
      opSeq: _context.opSeq,
      dataConfig: _data.cloneJson(_context.helperDataConfig || _context.dataConfig || null),
      hierarchySnapshot: null,
      helperTableResult: null,
      resetIntent: {
        enabled: true,
        scope: "helperTarget",
        clearAllSlots: true,
        clearAllLocalFilters: true,
        reason: _context.cleanupReason || "postResolution"
      },
      emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
      config: _data.cloneJson(_context.config || {})
    };
  }

  function specFailure(errorCode, errorMessage) {
    return { ok: false, errorCode: errorCode, errorMessage: errorMessage };
  }

  return {
    buildTopNSpec: buildTopNSpec,
    buildCleanupSpec: buildCleanupSpec
  };
});

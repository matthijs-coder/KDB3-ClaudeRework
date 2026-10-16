define([
  "./resolveFilterItemId.js",
  "./buildTopNFilter.js",
  "./buildHierarchyFilter.js",
  "./filterValueHelpers.js",
  "../defaults/normalizeDefaultValue.js",
  "../../../config/visualizations/buildKennzahlAggregationFilter.js"
], function (_resolveFilterItemId, _buildTopNFilter, _buildHierarchyFilter, _filterValueHelpers, _normalizeDefaultValue, _buildKennzahlAggregationFilter) {
  "use strict";

  var valuesOf = _filterValueHelpers.valuesOf;
  var upsert = _filterValueHelpers.upsert;
  var resolveFilterRule = _filterValueHelpers.resolveFilterRule;

  function resolveKennzahlPack(_dataConfig) {
    var bucket = _normalizeDefaultValue(_dataConfig && _dataConfig.visPropBucketKey);
    var grouping = _dataConfig && _dataConfig.grouping;
    if (bucket === "com.ibm.vis.custom.prognoseyearlinechart") { return "stichtag"; }
    if (bucket === "List") { return grouping === "jahr" ? "jahr" : "list"; }
    if (grouping === "jahr") { return "jahr"; }
    if (grouping === "jahrStichtag" || grouping === "stichtagProJahrH" || grouping === "stichtagProJahrV") { return "stichtag"; }
    return bucket === "Line" ? "stichtag" : "jahr";
  }

  function upsertKennzahlFilter(_map, _filters) {
    var filters = _filters || {};
    var itemIds = Object.keys(filters);
    for (var i = 0; i < itemIds.length; i += 1) {
      var shape = filters[itemIds[i]] || {};
      var mode = shape.mode || (shape.exclude ? "exclude" : shape.reverse ? "reverse" : "include");
      var vals = valuesOf(shape.values || shape.include || shape.exclude || shape.reverse);
      if (vals.length) {
        upsert(_map, { kind: "kennzahlDefault", mode: mode, itemId: itemIds[i], values: vals });
      }
    }
  }

  function addWidgetFilters(_spec, _map) {
    var widgetFilter = _spec.dataConfig && _spec.dataConfig.visTypeConfig && _spec.dataConfig.visTypeConfig.widgetFilter;
    if (!widgetFilter) {
      return { ok: true };
    }
    var keys = Object.keys(widgetFilter);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var resolved = _resolveFilterItemId(key, _spec.config.parameterMappingObj);
      if (!resolved.ok) {
        return resolved;
      }
      var shape = widgetFilter[key] || {};
      var mode = shape.exclude ? "exclude" : shape.reverse ? "reverse" : "include";
      var source = shape.exclude || shape.reverse || shape.include || shape.values;
      var vals = valuesOf(source);
      if (vals.length) {
        upsert(_map, { kind: "widgetFilter", mode: mode, itemId: resolved.itemId, values: vals });
      }
    }
    return { ok: true };
  }

  function addKennzahlDefaults(_spec, _map) {
    var root = _spec.dataConfig && _spec.dataConfig.kennzahlDefaults;
    if (!root) {
      return { ok: true };
    }
    var built = _buildKennzahlAggregationFilter.buildKennzahlAggregationFilter(root, resolveKennzahlPack(_spec.dataConfig));
    upsertKennzahlFilter(_map, built.filter);
    upsertKennzahlFilter(_map, built.extraFilter);
    return { ok: true };
  }

  function addDimensionFilters(_spec, _map) {
    var dimension = _normalizeDefaultValue(_spec.dataConfig && _spec.dataConfig.dimension);
    if (!dimension) {
      return { ok: true };
    }
    var entry = _spec.dataConfig.dataTableConfig && _spec.dataConfig.dataTableConfig.dimensions && _spec.dataConfig.dataTableConfig.dimensions[dimension];
    if (!entry) {
      return { ok: true };
    }
    if (!entry.itemId) {
      return { ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_ITEM" };
    }
    var itemId = String(entry.itemId);
    var includeRule = resolveFilterRule(entry.include, itemId);
    var excludeRule = resolveFilterRule(entry.exclude, itemId);
    var reverseRule = resolveFilterRule(entry.reverse, itemId);
    if (includeRule && excludeRule && includeRule.itemId === excludeRule.itemId) {
      upsert(_map, { kind: "dimension", mode: "includeExcludeOr", itemId: includeRule.itemId, values: includeRule.values.concat(excludeRule.values), options: { includeValues: includeRule.values, excludeValues: excludeRule.values } });
    } else {
      if (includeRule) {
        upsert(_map, { kind: "dimension", mode: "include", itemId: includeRule.itemId, values: includeRule.values });
      }
      if (excludeRule) {
        upsert(_map, { kind: "dimension", mode: "exclude", itemId: excludeRule.itemId, values: excludeRule.values });
      }
    }
    if (reverseRule) {
      upsert(_map, { kind: "dimension", mode: "reverse", itemId: reverseRule.itemId, values: reverseRule.values });
    }
    return { ok: true };
  }

  function __controller(_spec, _parsedTopN, _resolvedEmptyIntent, _diagnostics) {
    var map = {};
    var step = addWidgetFilters(_spec, map);
    if (!step.ok) {
      return { ok: false, errorCode: step.errorCode, key: step.key };
    }
    step = addKennzahlDefaults(_spec, map);
    if (!step.ok) {
      return step;
    }
    step = addDimensionFilters(_spec, map);
    if (!step.ok) {
      return step;
    }
    if (_resolvedEmptyIntent && _resolvedEmptyIntent.enabled === true) {
      upsert(map, { kind: "emptyData", mode: "forceEmpty", itemId: _resolvedEmptyIntent.itemId, values: ["1"], reason: _resolvedEmptyIntent.reason || undefined });
    }
    var topNResult = _buildTopNFilter(_spec, _parsedTopN);
    if (!topNResult.ok) {
      return topNResult;
    }
    if (topNResult.descriptor) {
      upsert(map, topNResult.descriptor);
    }
    var hierarchyResult = _buildHierarchyFilter(_spec);
    if (!hierarchyResult.ok) {
      return hierarchyResult;
    }
    if (hierarchyResult.warning && _diagnostics && _diagnostics.warnings) {
      _diagnostics.warnings.push(hierarchyResult.warning);
    }
    if (hierarchyResult.descriptor) {
      upsert(map, hierarchyResult.descriptor);
    }
    var keys = Object.keys(map);
    var descriptors = [];
    for (var i = 0; i < keys.length; i += 1) {
      descriptors.push(map[keys[i]]);
    }
    return { ok: true, localFilters: descriptors, managedFilterItemIds: keys.slice(), topNResultValues: topNResult.topNResultValues, topNExcludeItemId: topNResult.topNExcludeItemId };
  }

  return __controller;
});

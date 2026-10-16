define([
  "./filterItemIds.js",
  "./buildTopNFilter.js",
  "./buildHierarchyFilter.js",
  "../../../utils/normalizeDefaultValue.js",
  "../../../config/visualizations/buildKennzahlAggregationFilter.js",
  "../../../utils/kit/data.js",
], function (_filterItemIds, _buildTopNFilter, _buildHierarchyFilter, _normalizeDefaultValue, _kennzahlAggregationFilter, _data) {
  "use strict";

  function normalizeFilterValue(_value) {
    if (typeof _value === "string" && _value.trim()) { return _value.trim(); }
    if (!_value || typeof _value !== "object" || Array.isArray(_value)) { return null; }
    var display = _value.d != null ? _value.d : _value.display != null ? _value.display : _value.displayValue;
    var use = _value.u != null ? _value.u : _value.use != null ? _value.use : _value.useValue;
    if (display == null && use == null) { return null; }
    return { d: String(display != null ? display : use), u: String(use != null ? use : display) };
  }

  function valuesOf(_value) {
    if (!Array.isArray(_value)) { return []; }
    var out = [];
    for (var i = 0; i < _value.length; i += 1) {
      var normalized = normalizeFilterValue(_value[i]);
      if (normalized != null) { out.push(normalized); }
    }
    return out;
  }

  function upsert(_map, _descriptor) {
    if (_descriptor && _descriptor.itemId) { _map[_descriptor.itemId] = _data.cloneJson(_descriptor); }
  }

  function resolveFilterRule(_rule, _fallbackItemId) {
    if (_rule == null) { return null; }
    if (typeof _rule === "object" && !Array.isArray(_rule)) {
      var nestedId = _rule.itemId ? String(_rule.itemId).trim() : "";
      var nestedVals = valuesOf(_rule.values);
      return nestedId && nestedVals.length ? { itemId: nestedId, values: nestedVals } : null;
    }
    var flatVals = valuesOf(_rule);
    return _fallbackItemId && flatVals.length ? { itemId: _fallbackItemId, values: flatVals } : null;
  }

  function resolveKennzahlPack(_dataConfig) {
    var bucket = _normalizeDefaultValue(_dataConfig && _dataConfig.visPropBucketKey);
    return _kennzahlAggregationFilter.resolveKennzahlPack(bucket, _dataConfig && _dataConfig.grouping);
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
      var resolved = _filterItemIds.resolveFilterItemId(key, _spec.config.parameterMappingObj);
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
    var built = _kennzahlAggregationFilter.buildKennzahlAggregationFilter(root, resolveKennzahlPack(_spec.dataConfig));
    upsertKennzahlFilter(_map, built.filter);
    upsertKennzahlFilter(_map, built.extraFilter);
    return { ok: true };
  }

  function addDimensionFilters(_spec, _map) {
    var dimension = _normalizeDefaultValue(_spec.dataConfig && _spec.dataConfig.dimension);
    if (!dimension) {
      return { ok: true };
    }
    var tableConfig = _spec.dataConfig.dataTableConfig;
    var entry = tableConfig && tableConfig.dimensions && tableConfig.dimensions[dimension];
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
      upsert(_map, {
        kind: "dimension",
        mode: "includeExcludeOr",
        itemId: includeRule.itemId,
        values: includeRule.values.concat(excludeRule.values),
        options: { includeValues: includeRule.values, excludeValues: excludeRule.values },
      });
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

  function buildLocalFilters(_spec, _parsedTopN, _resolvedEmptyIntent, _diagnostics) {
    var map = {};
    var step = addWidgetFilters(_spec, map);
    if (!step.ok) {
      return step;
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
      upsert(map, {
        kind: "emptyData",
        mode: "forceEmpty",
        itemId: _resolvedEmptyIntent.itemId,
        values: ["1"],
        reason: _resolvedEmptyIntent.reason || undefined,
      });
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
    return {
      ok: true,
      localFilters: keys.map(function (_key) { return map[_key]; }),
      managedFilterItemIds: keys,
      topNResultValues: topNResult.topNResultValues,
      topNExcludeItemId: topNResult.topNExcludeItemId,
    };
  }

  return buildLocalFilters;
});

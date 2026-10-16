define([
  "./config/visTypeRules.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kennzahlAggregationFilter.js"
], function (_rules, _data, _kennzahlAggregationFilter) {
  "use strict";

  var LOCAL_METRICS_DATASOURCE_FALLBACK = "Personal_KDB";

  function normalizeVisualizationType(_rawType) {
    return _rules.normalizeVisType(_rawType);
  }

  function readVisualizationsConfig(_KDB) {
    return (_KDB && _KDB.config && _KDB.config.visualizations) || {};
  }

  function resolveCurrentMetricsDataSource(_KDB) {
    var api = _KDB && _KDB.api && _KDB.api.dataSourceContext;
    var fromApi = api && typeof api.getCurrentMetricsDataSource === "function"
      ? api.getCurrentMetricsDataSource()
      : null;
    if (fromApi != null && fromApi !== "") {
      return String(fromApi).trim();
    }
    var configDefault = _KDB && _KDB.config && _KDB.config.dataSources && _KDB.config.dataSources.metrics
      ? _KDB.config.dataSources.metrics.default
      : null;
    if (configDefault && typeof configDefault === "object" && configDefault.name) {
      return String(configDefault.name).trim();
    }
    if (configDefault != null && configDefault !== "") {
      return String(configDefault).trim();
    }
    return LOCAL_METRICS_DATASOURCE_FALLBACK;
  }

  function resolveDefaultVisualizationType(_KDB) {
    var definitions = readVisualizationsConfig(_KDB).definitions || {};
    return definitions.defaultType || "Line";
  }

  function resolveVisualizationDefinition(_visualizationType, _KDB) {
    var definitions = readVisualizationsConfig(_KDB).definitions || {};
    var catalog = definitions.visualizations || {};
    var normalized = normalizeVisualizationType(_visualizationType);
    if (normalized && catalog[normalized]) {
      return catalog[normalized];
    }
    return {};
  }

  function resolveVisualizationPropertyValues(_visualizationType, _KDB) {
    var definition = resolveVisualizationDefinition(_visualizationType, _KDB);
    return definition.propertyValues || {};
  }

  function resolveVisualizationLayoutPropertyValues(_visualizationType, _KDB) {
    var definition = resolveVisualizationDefinition(_visualizationType, _KDB);
    return definition.layoutPropertyValues || {};
  }

  function resolveKennzahlDefaults(_kennzahlCode, _KDB) {
    if (!_kennzahlCode) {
      return {};
    }
    var defaults = readVisualizationsConfig(_KDB).kennzahlDefaults || {};
    return defaults[_kennzahlCode] || {};
  }

  function resolveVisPropBucketKey(_visualizationType, _KDB) {
    var bindingSpecs = readVisualizationsConfig(_KDB).bindingSpecs || {};
    return _rules.resolveBucket(_visualizationType, bindingSpecs.visualizationTypeToBucket);
  }

  function resolveCognosVisualizationTypeId(_visualizationType, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    var visConfig = readVisualizationsConfig(_KDB);
    var bindingSpecs = visConfig.bindingSpecs || {};
    var entry = bucket && bindingSpecs.visTypeByBucket ? bindingSpecs.visTypeByBucket[bucket] : null;
    if (entry && entry.cognosVisualizationTypeId) {
      return entry.cognosVisualizationTypeId;
    }
    var definitions = visConfig.definitions || {};
    var catalog = definitions.visualizations || {};
    var normalized = normalizeVisualizationType(_visualizationType);
    if (normalized && catalog[normalized] && catalog[normalized].id) {
      return catalog[normalized].id;
    }
    return bucket || normalized;
  }

  function resolveVisTypeConfig(_kennzahlenTable, _visualizationType, _KDB) {
    var defaultTable = resolveCurrentMetricsDataSource(_KDB);
    var table = _kennzahlenTable || defaultTable;
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    var bindingSpecs = readVisualizationsConfig(_KDB).bindingSpecs || {};
    var bucketEntry = bucket && bindingSpecs.visTypeByBucket ? bindingSpecs.visTypeByBucket[bucket] : null;
    var byTable = bucketEntry && bucketEntry.byKennzahlenTable ? bucketEntry.byKennzahlenTable : {};
    return byTable[table] || byTable[defaultTable] || null;
  }

  function readGrainEntry(_visualizationType, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    var grainByBucket = (readVisualizationsConfig(_KDB).bindingSpecs || {}).grainByBucket || {};
    if (!bucket || !Object.prototype.hasOwnProperty.call(grainByBucket, bucket)) {
      return null;
    }
    return grainByBucket[bucket];
  }

  function resolveDefaultGrain(_visualizationType, _KDB) {
    var entry = readGrainEntry(_visualizationType, _KDB);
    return entry && typeof entry.defaultGrain === "string" ? entry.defaultGrain : undefined;
  }

  function resolveGrainOverlay(_visualizationType, _grain, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    if (bucket === "com.ibm.vis.custom.prognoseyearlinechart") {
      return undefined;
    }
    if (typeof _grain === "string" && !_rules.isAllowedGrain(bucket, _grain)) {
      return undefined;
    }
    var grains = (readGrainEntry(_visualizationType, _KDB) || {}).grains;
    if (!grains || typeof _grain !== "string" || !Object.prototype.hasOwnProperty.call(grains, _grain)) {
      return undefined;
    }
    var overlay = grains[_grain];
    return _data.isObjectLike(overlay) ? overlay : undefined;
  }

  function resolveEffectiveGrain(_visualizationType, _grouping, _KDB) {
    if (_rules.isAllowedGrain(resolveVisPropBucketKey(_visualizationType, _KDB), _grouping)) {
      return _grouping;
    }
    return resolveDefaultGrain(_visualizationType, _KDB);
  }

  function resolveKennzahlPack(_visualizationType, _grouping, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    if (_kennzahlAggregationFilter.hasKennzahlPackRule(bucket)) {
      return _kennzahlAggregationFilter.resolveKennzahlPack(bucket, _grouping);
    }
    // No pack rule for this bucket: legacy answer (echo of the effective grain), pinned by the widgetVis-core golden.
    var grain = resolveEffectiveGrain(_visualizationType, _grouping, _KDB);
    if (grain === "jahr") {
      return "jahr";
    }
    return _rules.isGrain(grain) ? "stichtag" : grain;
  }

  return {
    normalizeVisualizationType: normalizeVisualizationType,
    readVisualizationsConfig: readVisualizationsConfig,
    resolveCurrentMetricsDataSource: resolveCurrentMetricsDataSource,
    resolveDefaultVisualizationType: resolveDefaultVisualizationType,
    resolveVisualizationDefinition: resolveVisualizationDefinition,
    resolveVisualizationPropertyValues: resolveVisualizationPropertyValues,
    resolveVisualizationLayoutPropertyValues: resolveVisualizationLayoutPropertyValues,
    resolveKennzahlDefaults: resolveKennzahlDefaults,
    buildKennzahlAggregationFilter: _kennzahlAggregationFilter.buildKennzahlAggregationFilter,
    resolveVisPropBucketKey: resolveVisPropBucketKey,
    resolveCognosVisualizationTypeId: resolveCognosVisualizationTypeId,
    resolveVisTypeConfig: resolveVisTypeConfig,
    resolveDefaultGrain: resolveDefaultGrain,
    resolveGrainOverlay: resolveGrainOverlay,
    resolveEffectiveGrain: resolveEffectiveGrain,
    resolveKennzahlPack: resolveKennzahlPack
  };
});

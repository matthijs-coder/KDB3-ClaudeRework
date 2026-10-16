define([
  "./readVisualizationsConfig.js",
  "./normalizeVisualizationType.js",
  "./resolveMetricsDataSource.js"
], function (_readVisualizationsConfig, _normalizeVisualizationType, _resolveMetricsDataSource) {
  "use strict";

  function resolveVisPropBucketKey(_visualizationType, _KDB) {
    var visConfig = _readVisualizationsConfig(_KDB);
    var bindingSpecs = visConfig.bindingSpecs || {};
    var map = bindingSpecs.visualizationTypeToBucket || {};
    var normalized = _normalizeVisualizationType(_visualizationType);
    if (normalized && map[normalized]) {
      return map[normalized];
    }
    if (normalized && map[normalized.toLowerCase()]) {
      return map[normalized.toLowerCase()];
    }
    return normalized;
  }

  function resolveCognosVisualizationTypeId(_visualizationType, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    var visConfig = _readVisualizationsConfig(_KDB);
    var bindingSpecs = visConfig.bindingSpecs || {};
    var entry = bucket && bindingSpecs.visTypeByBucket ? bindingSpecs.visTypeByBucket[bucket] : null;
    if (entry && entry.cognosVisualizationTypeId) {
      return entry.cognosVisualizationTypeId;
    }
    var definitions = visConfig.definitions || {};
    var catalog = definitions.visualizations || {};
    var normalized = _normalizeVisualizationType(_visualizationType);
    if (normalized && catalog[normalized] && catalog[normalized].id) {
      return catalog[normalized].id;
    }
    return bucket || normalized;
  }

  function resolveVisTypeConfig(_kennzahlenTable, _visualizationType, _KDB) {
    var defaultTable = _resolveMetricsDataSource(_KDB);
    var table = _kennzahlenTable || defaultTable;
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    var bindingSpecs = _readVisualizationsConfig(_KDB).bindingSpecs || {};
    var bucketEntry = bucket && bindingSpecs.visTypeByBucket ? bindingSpecs.visTypeByBucket[bucket] : null;
    var byTable = bucketEntry && bucketEntry.byKennzahlenTable ? bucketEntry.byKennzahlenTable : {};
    return byTable[table] || byTable[defaultTable] || null;
  }

  function readGrainEntry(_visualizationType, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    var grainByBucket = (_readVisualizationsConfig(_KDB).bindingSpecs || {}).grainByBucket || {};
    if (!bucket || !Object.prototype.hasOwnProperty.call(grainByBucket, bucket)) {
      return null;
    }
    return grainByBucket[bucket];
  }

  function isPlainObject(_value) {
    return !!_value && typeof _value === "object" && !Array.isArray(_value);
  }

  function resolveDefaultGrain(_visualizationType, _KDB) {
    var entry = readGrainEntry(_visualizationType, _KDB);
    return entry && typeof entry.defaultGrain === "string" ? entry.defaultGrain : undefined;
  }

  function isExplicitGrain(_grouping) {
    return _grouping === "stichtag" || _grouping === "jahr" || _grouping === "jahrStichtag" || _grouping === "stichtagProJahrH" || _grouping === "stichtagProJahrV";
  }

  function isPieStackedBucket(_bucket) {
    return _bucket === "pie" || _bucket === "StackedBar" || _bucket === "StackedColumn";
  }

  function isAllowedGrain(_bucket, _grain) {
    if (_bucket === "List") {
      return _grain === "jahr" || _grain === "jahrStichtag";
    }
    if (_bucket === "com.ibm.vis.custom.prognoseyearlinechart") {
      return false;
    }
    if (isPieStackedBucket(_bucket)) {
      return _grain === "jahr" || _grain === "jahrStichtag" || _grain === "stichtagProJahrH" || _grain === "stichtagProJahrV";
    }
    return isExplicitGrain(_grain);
  }

  function resolveGrainOverlay(_visualizationType, _grain, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    if (bucket === "com.ibm.vis.custom.prognoseyearlinechart") {
      return undefined;
    }
    if (typeof _grain === "string" && !isAllowedGrain(bucket, _grain)) {
      return undefined;
    }
    var grains = (readGrainEntry(_visualizationType, _KDB) || {}).grains;
    if (!grains || typeof _grain !== "string" || !Object.prototype.hasOwnProperty.call(grains, _grain)) {
      return undefined;
    }
    var overlay = grains[_grain];
    return isPlainObject(overlay) ? overlay : undefined;
  }

  function resolveEffectiveGrain(_visualizationType, _grouping, _KDB) {
    if (isExplicitGrain(_grouping) && isAllowedGrain(resolveVisPropBucketKey(_visualizationType, _KDB), _grouping)) {
      return _grouping;
    }
    return resolveDefaultGrain(_visualizationType, _KDB);
  }

  function resolveKennzahlPack(_visualizationType, _grouping, _KDB) {
    var bucket = resolveVisPropBucketKey(_visualizationType, _KDB);
    if (bucket === "com.ibm.vis.custom.prognoseyearlinechart") {
      return "stichtag";
    }
    var grain = resolveEffectiveGrain(_visualizationType, _grouping, _KDB);
    if (!isAllowedGrain(bucket, grain)) {
      grain = resolveDefaultGrain(_visualizationType, _KDB);
    }
    if (bucket === "List") {
      return grain === "jahr" ? "jahr" : "list";
    }
    if (grain === "jahr") {
      return "jahr";
    }
    if (grain === "stichtag" || grain === "jahrStichtag" || grain === "stichtagProJahrH" || grain === "stichtagProJahrV") {
      return "stichtag";
    }
    return grain;
  }

  return {
    resolveVisPropBucketKey: resolveVisPropBucketKey,
    resolveCognosVisualizationTypeId: resolveCognosVisualizationTypeId,
    resolveVisTypeConfig: resolveVisTypeConfig,
    resolveDefaultGrain: resolveDefaultGrain,
    resolveGrainOverlay: resolveGrainOverlay,
    resolveEffectiveGrain: resolveEffectiveGrain,
    resolveKennzahlPack: resolveKennzahlPack
  };
});

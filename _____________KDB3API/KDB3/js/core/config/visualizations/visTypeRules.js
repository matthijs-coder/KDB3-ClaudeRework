define([
  "./bindingSpecsVisTypes.js"
], function (_visTypeSpecs) {
  "use strict";

  // Single source for vis-type identity and grain rules (aliases, grains, allowed grains per bucket).
  // The type -> bucket table stays in bindingSpecsVisTypes.visualizationTypeToBucket (also served through
  // _KDB.config.visualizations); this module adds no keys to that config because its hash is pinned by goldens.
  var GRAINS = Object.freeze(["stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"]);
  var ALIASES = Object.freeze({
    line: "Line",
    pie: "Pie",
    stackedbar: "StackedBar",
    stackedcolumn: "StackedColumn",
    list: "List",
    prognose: "Prognose",
    "com.ibm.vis.custom.prognoseyear": "Prognose",
    "com.ibm.vis.custom.prognoseyearlinechart": "Prognose"
  });
  var PIE_STACKED_GRAINS = Object.freeze(["jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"]);
  // A bucket that is not listed accepts every grain; an empty list accepts none.
  var ALLOWED_GRAINS_BY_BUCKET = Object.freeze({
    pie: PIE_STACKED_GRAINS,
    StackedBar: PIE_STACKED_GRAINS,
    StackedColumn: PIE_STACKED_GRAINS,
    List: Object.freeze(["jahr", "jahrStichtag"]),
    "com.ibm.vis.custom.prognoseyearlinechart": Object.freeze([])
  });
  var TYPE_TO_BUCKET = _visTypeSpecs.visualizationTypeToBucket;

  function hasOwn(_object, _key) {
    return Object.prototype.hasOwnProperty.call(_object, _key);
  }

  function isGrain(_value) {
    return GRAINS.indexOf(_value) !== -1;
  }

  function lookupCanonicalType(_text) {
    var lower = _text.toLowerCase();
    return hasOwn(ALIASES, lower) ? ALIASES[lower] : null;
  }

  // Known alias (any case, surrounding blanks ignored) -> canonical type, else null.
  function canonicalTypeOf(_rawType) {
    return _rawType == null ? null : lookupCanonicalType(String(_rawType).trim());
  }

  // Canonical type for a known alias, the trimmed text otherwise, null for null/"".
  function normalizeVisType(_rawType) {
    if (_rawType == null || _rawType === "") {
      return null;
    }
    var text = String(_rawType).trim();
    return lookupCanonicalType(text) || text;
  }

  function bucketOf(_normalizedType, _typeToBucket) {
    if (!_normalizedType) {
      return _normalizedType;
    }
    var map = _typeToBucket || TYPE_TO_BUCKET;
    if (hasOwn(map, _normalizedType)) {
      return map[_normalizedType];
    }
    var lower = _normalizedType.toLowerCase();
    return hasOwn(map, lower) ? map[lower] : _normalizedType;
  }

  // _typeToBucket lets a caller pass its (equal) copy of the table, e.g. _KDB.config.visualizations.bindingSpecs.
  function resolveBucket(_rawType, _typeToBucket) {
    return bucketOf(normalizeVisType(_rawType), _typeToBucket);
  }

  function isAllowedGrain(_bucket, _grain) {
    var listed = typeof _bucket === "string" && hasOwn(ALLOWED_GRAINS_BY_BUCKET, _bucket);
    return (listed ? ALLOWED_GRAINS_BY_BUCKET[_bucket] : GRAINS).indexOf(_grain) !== -1;
  }

  // Dropdown option key of a vis type: lower-case canonical type; an unknown type keeps its own spelling.
  function settingsKey(_rawType) {
    if (_rawType == null) {
      return "";
    }
    var canonical = canonicalTypeOf(_rawType);
    return canonical ? canonical.toLowerCase() : String(_rawType).trim();
  }

  // Prognose has no user dimension. TopN is ranked by the dimension, so it follows this predicate.
  function supportsDimension(_rawType) {
    return resolveBucket(_rawType) !== "com.ibm.vis.custom.prognoseyearlinechart";
  }

  // Which settings a vis-type switch onto targetRaw deletes. Sentinels stay in widgetSettings.
  function controlsTargetClears(targetRaw, grouping) {
    var out = { dimension: !supportsDimension(targetRaw), grouping: false };
    if (isGrain(grouping) && !isAllowedGrain(resolveBucket(targetRaw), grouping)) {
      out.grouping = true;
    }
    return out;
  }

  return {
    GRAINS: GRAINS,
    isGrain: isGrain,
    normalizeVisType: normalizeVisType,
    resolveBucket: resolveBucket,
    isAllowedGrain: isAllowedGrain,
    settingsKey: settingsKey,
    supportsDimension: supportsDimension,
    controlsTargetClears: controlsTargetClears
  };
});

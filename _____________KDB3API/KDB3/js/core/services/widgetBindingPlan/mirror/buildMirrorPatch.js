define([
  "../defaults/normalizeDefaultValue.js",
], function (_normalizeDefaultValue) {
  "use strict";

  function resolveActiveTopNValue(_parsedTopN) {
    if (!_parsedTopN || _parsedTopN.kind !== "count") {
      return "default";
    }
    if (_parsedTopN.value) {
      return String(_parsedTopN.value);
    }
    if (typeof _parsedTopN.n === "number") {
      return "top-" + _parsedTopN.n;
    }
    return "top-N";
  }

  function __controller(_spec, _parsedTopN, _filterResult) {
    var dataConfig = _spec.dataConfig || {};
    var filterResult = _filterResult || {};
    var parsedTopN = _parsedTopN || { kind: "default" };
    var dimension = _normalizeDefaultValue(dataConfig.dimension);
    var normalizedDimension = dimension || "default";
    var isDefaultTopN = !parsedTopN || parsedTopN.kind === "default";
    var isDefaultDimension = !dimension;
    var patch = {
      visualizationType: dataConfig.visualizationType || undefined,
      dimension: normalizedDimension,
      datasourceId: dataConfig.datasourceId || undefined,
      datasourceName: dataConfig.datasourceName == null ? null : String(dataConfig.datasourceName),
    };

    if (isDefaultTopN || isDefaultDimension) {
      patch.topN = "default";
      return patch;
    }

    patch.topN = resolveActiveTopNValue(parsedTopN);
    if (filterResult.topNResultValues) {
      patch.topNResultValues = filterResult.topNResultValues.slice();
    }
    if (filterResult.topNExcludeItemId) {
      patch.topNExcludeItemId = filterResult.topNExcludeItemId;
    }
    return patch;
  }

  return __controller;
});

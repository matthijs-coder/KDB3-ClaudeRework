define(["../../../utils/rewriteUniqueNameSourceToken.js"], function (_sourceTokens) {
  "use strict";

  function stripTm1Suffix(_token) {
    return String(_token).replace(/_TM1$/i, "");
  }

  function resolveTargetSourceToken(_dataConfig) {
    return _dataConfig.datasourceName || _dataConfig.datasourceId || _dataConfig.kennzahlenTable || "";
  }

  /** Finds the filterPropObj entry for the active downstream or, failing that, for the target datasource. */
  function matchFilterPropEntry(_filterPropObj, _activeDownstreamName, _dataConfig) {
    var filterPropObj = _filterPropObj && typeof _filterPropObj === "object" ? _filterPropObj : {};
    if (_activeDownstreamName && filterPropObj[_activeDownstreamName]) {
      return { sourceKey: _activeDownstreamName, entry: filterPropObj[_activeDownstreamName] };
    }
    var candidates = [_dataConfig.datasourceName, _dataConfig.datasourceId, _dataConfig.kennzahlenTable];
    var keys = Object.keys(filterPropObj);
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      var keyNorm = stripTm1Suffix(key).toLowerCase();
      for (var cIndex = 0; cIndex < candidates.length; cIndex += 1) {
        var candidate = candidates[cIndex];
        if (!candidate) {
          continue;
        }
        var candidateNorm = stripTm1Suffix(candidate).toLowerCase();
        if (candidateNorm && keyNorm.indexOf(candidateNorm) >= 0) {
          return { sourceKey: key, entry: filterPropObj[key] };
        }
      }
    }
    return null;
  }

  /** Item id of the matched hierarchy entry, rewritten to the target datasource; null when there is no entry or item id. */
  function resolveHierarchyItemId(_matched, _dataConfig) {
    if (!_matched || !_matched.entry || !_matched.entry.itemId) {
      return null;
    }
    return _sourceTokens.rewriteUniqueNameSourceToken(String(_matched.entry.itemId), resolveTargetSourceToken(_dataConfig), _matched.sourceKey);
  }

  function resolveFilterItemId(_key, _parameterMappingObj) {
    var key = typeof _key === "string" ? _key.trim() : "";
    if (!key) {
      return { ok: false, errorCode: "WIDGET_BINDING_PLAN_FILTER_PARAM_MAP", key: key };
    }
    if (key.charAt(0) === "[") {
      return { ok: true, itemId: key };
    }
    var parameterMappingObj = _parameterMappingObj && typeof _parameterMappingObj === "object" ? _parameterMappingObj : {};
    var mapKey = key + "_widget_localfilter_KID";
    var itemId = parameterMappingObj[mapKey];
    if (typeof itemId === "string" && itemId.trim()) {
      return { ok: true, itemId: itemId.trim(), mapKey: mapKey };
    }
    return { ok: false, errorCode: "WIDGET_BINDING_PLAN_FILTER_PARAM_MAP", key: key, mapKey: mapKey };
  }

  return {
    matchFilterPropEntry: matchFilterPropEntry,
    resolveHierarchyItemId: resolveHierarchyItemId,
    resolveFilterItemId: resolveFilterItemId,
  };
});

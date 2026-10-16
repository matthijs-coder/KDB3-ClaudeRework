define([], function () {
  "use strict";

  function __controller(_filterPropObj, _activeDownstreamName, _dataConfig) {
    var filterPropObj = _filterPropObj && typeof _filterPropObj === "object" ? _filterPropObj : {};
    if (_activeDownstreamName && filterPropObj[_activeDownstreamName]) {
      return { sourceKey: _activeDownstreamName, entry: filterPropObj[_activeDownstreamName] };
    }
    var candidates = [_dataConfig.datasourceName, _dataConfig.datasourceId, _dataConfig.kennzahlenTable];
    var keys = Object.keys(filterPropObj);
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      var keyNorm = key.replace(/_TM1$/i, "").toLowerCase();
      for (var cIndex = 0; cIndex < candidates.length; cIndex += 1) {
        var candidate = candidates[cIndex];
        if (!candidate) {
          continue;
        }
        var candidateNorm = String(candidate).replace(/_TM1$/i, "").toLowerCase();
        if (candidateNorm && keyNorm.indexOf(candidateNorm) >= 0) {
          return { sourceKey: key, entry: filterPropObj[key] };
        }
      }
    }
    return null;
  }

  return __controller;
});

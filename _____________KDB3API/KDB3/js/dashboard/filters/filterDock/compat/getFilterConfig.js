define(["../../../../core/utils/getKennzahlenSource.js"], function (_getKennzahlenSource) {
  "use strict";

  function __controller(_KDB, _filterLabel, _filterScope, _kennzahlenSource) {
    var filterPropObj = _KDB && _KDB.properties && _KDB.properties.filterPropObj;
    var kennzahlenSource = _kennzahlenSource || _getKennzahlenSource(_KDB);
    var sourceCfg = filterPropObj && kennzahlenSource ? filterPropObj[kennzahlenSource] : null;
    if (!sourceCfg) {
      return null;
    }
    var scopeFilters =
      _filterScope === "global" ? sourceCfg.globalFilters : sourceCfg.pageContextFilters;
    return (scopeFilters && scopeFilters[_filterLabel]) || null;
  }

  return __controller;
});

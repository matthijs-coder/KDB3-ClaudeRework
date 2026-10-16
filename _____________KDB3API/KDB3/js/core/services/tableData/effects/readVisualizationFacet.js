define([], function () {
  "use strict";

  function __controller(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.tableData : null;
    return rt && rt.visualizationFacet ? rt.visualizationFacet : null;
  }

  return __controller;
});

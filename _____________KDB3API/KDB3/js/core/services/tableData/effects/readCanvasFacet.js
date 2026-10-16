define([], function () {
  "use strict";

  function __controller(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.tableData : null;
    return rt && rt.canvasFacet ? rt.canvasFacet : null;
  }

  return __controller;
});

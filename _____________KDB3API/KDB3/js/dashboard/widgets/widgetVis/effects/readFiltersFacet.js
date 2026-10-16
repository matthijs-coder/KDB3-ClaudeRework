define([], function () {
  "use strict";

  function __controller(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    return rt && rt.filtersFacet ? rt.filtersFacet : null;
  }

  return __controller;
});

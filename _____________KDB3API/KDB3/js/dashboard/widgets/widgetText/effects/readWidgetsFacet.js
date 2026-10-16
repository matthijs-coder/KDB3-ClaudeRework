define([], function () {
  "use strict";

  function __controller(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetText : null;
    return rt && rt.widgetsFacet ? rt.widgetsFacet : null;
  }

  return __controller;
});

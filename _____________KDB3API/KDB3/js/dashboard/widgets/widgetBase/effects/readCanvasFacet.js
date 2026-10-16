define([], function () {
  "use strict";

  // Injected by __orchestratorWidgetBase onto runtime.canvasFacet. Deep files
  // must not look up _KDB.services.cognosHost themselves (contract §7).
  function __controller(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetBase : null;
    return rt && rt.canvasFacet ? rt.canvasFacet : null;
  }

  return __controller;
});

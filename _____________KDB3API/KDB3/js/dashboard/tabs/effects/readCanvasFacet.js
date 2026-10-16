define([], function () {
  "use strict";

  // Stamp is injected by __orchestratorTabs onto runtime.tabs.canvasFacet.
  // Deep files do not look up _KDB.services.cognosHost.
  function __controller(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.tabs : null;
    return rt && rt.canvasFacet ? rt.canvasFacet : null;
  }

  return __controller;
});

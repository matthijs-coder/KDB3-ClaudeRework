define([], function () {
  "use strict";

  // Injected by __orchestratorDienststelle onto runtime.dienststelle.tabsFacet.
  // Deep files must not look up _KDB.services.cognosHost themselves (contract §7).
  function __controller(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.dienststelle : null;
    return rt && rt.tabsFacet ? rt.tabsFacet : null;
  }

  return __controller;
});

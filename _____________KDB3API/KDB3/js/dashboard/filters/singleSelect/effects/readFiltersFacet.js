define([], function () {
  "use strict";

  // Injected by __orchestratorSingleSelect onto runtime.filtersFacet. Deep
  // files must not look up _KDB.services.cognosHost themselves (contract §7).
  function __controller(_KDB, _runtime) {
    if (_runtime && _runtime.filtersFacet) {
      return _runtime.filtersFacet;
    }
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.singleSelect : null;
    return rt && rt.filtersFacet ? rt.filtersFacet : null;
  }

  return __controller;
});

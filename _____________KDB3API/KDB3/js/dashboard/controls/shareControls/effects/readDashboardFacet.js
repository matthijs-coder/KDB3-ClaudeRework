define([], function () {
  "use strict";

  function readDashboardFacet(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.shareControls;
    return rt && rt.dashboardFacet ? rt.dashboardFacet : null;
  }

  return readDashboardFacet;
});

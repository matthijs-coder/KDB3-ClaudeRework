define([], function () {
  "use strict";

  function readDashboardFacet(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.footer;
    return rt && rt.dashboardFacet ? rt.dashboardFacet : null;
  }

  return readDashboardFacet;
});

define(["./createAuthoringController.js"], function (_createAuthoringController) {
  "use strict";

  function attachDashboardFacet(_KDB) {
    var host = _KDB.services && _KDB.services.cognosHost;
    _KDB.runtime.authoring = _KDB.runtime.authoring || {};
    _KDB.runtime.authoring.dashboardFacet = host && host.dashboard ? host.dashboard : null;
    _createAuthoringController.syncFromDashboardMode(_KDB);
  }

  // Runs after the services are registered (cognosHost publishes the dashboard facet).
  function registerAuthoring(_KDB) {
    _KDB.api.authoring = _createAuthoringController(_KDB);
    _KDB.api.authoring.mount();
    // Stamp after mount: mount resets runtime.authoring to {}.
    attachDashboardFacet(_KDB);
  }
  return registerAuthoring;
});

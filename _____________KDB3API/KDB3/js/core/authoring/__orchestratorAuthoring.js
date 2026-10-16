define(["./createAuthoringController"], function (_createAuthoringController) {
  "use strict";

  function attachDashboardFacet(_KDB) {
    var host = _KDB.services && _KDB.services.cognosHost;
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.authoring = _KDB.runtime.authoring || {};
    _KDB.runtime.authoring.dashboardFacet = host && host.dashboard ? host.dashboard : null;
    _createAuthoringController.syncFromDashboardMode(_KDB);
  }

  function __orchestratorAuthoring(_KDB) {
    _KDB.api.authoring = _createAuthoringController(_KDB);
    _KDB.api.authoring.mount();
    // Stamp after mount: mount resets runtime.authoring to {}.
    attachDashboardFacet(_KDB);
    if (_KDB.runtime.authoring.dashboardFacet) {
      return;
    }
    // KDB.js setupCoreFactories runs this factory before _orchestratorServices
    // publishes cognosHost. One microtask is not a handshake: it only runs
    // after the current stack, and would still miss the facet if this factory
    // were awaited before services. One-shot: cognosHost invokes after create.
    _KDB.runtime.authoring.pendingDashboardFacetStamp = function pendingDashboardFacetStamp() {
      var runtimeAuthoring = _KDB.runtime && _KDB.runtime.authoring;
      if (runtimeAuthoring && runtimeAuthoring.pendingDashboardFacetStamp === pendingDashboardFacetStamp) {
        runtimeAuthoring.pendingDashboardFacetStamp = null;
      }
      attachDashboardFacet(_KDB);
    };
  }
  return __orchestratorAuthoring;
});

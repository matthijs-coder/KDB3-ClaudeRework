define(["./createCognosHostService.js"], function (_createCognosHostService) {
  "use strict";

  function notifyAuthoringIfMounted(_KDB) {
    var runtimeAuthoring = _KDB.runtime && _KDB.runtime.authoring;
    var pending = runtimeAuthoring && runtimeAuthoring.pendingDashboardFacetStamp;
    if (typeof pending === "function") {
      pending();
    }
  }

  function __orchestrator(_KDB) {
    try {
      _KDB.services = _KDB.services || {};
      if (!_KDB.services.cognosHost) {
        _KDB.services.cognosHost = _createCognosHostService(_KDB);
      }
      // Authoring boots before this factory in KDB.js setupCoreFactories.
      // After-create handshake: stamp + subscribe if authoring already mounted.
      notifyAuthoringIfMounted(_KDB);
      return _KDB.services.cognosHost;
    } catch (error) {
      console.error("[cognosHost.__orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});

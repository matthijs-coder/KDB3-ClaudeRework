define(["./createPageSurfaceController.js"], function (_createPageSurfaceController) {
  "use strict";

  function readCanvasFacet(_KDB) {
    const service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.canvas ? service.canvas : null;
  }

  function ensureRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.runtime.pageSurface = _KDB.runtime.pageSurface || {};
    _KDB.runtime.pageSurface.pending = _KDB.runtime.pageSurface.pending || {};
    _KDB.runtime.pageSurface.abortControllers = _KDB.runtime.pageSurface.abortControllers || {};
    _KDB.runtime.pageSurface.pendingPromises = _KDB.runtime.pageSurface.pendingPromises || {};
  }

  function stampCanvasFacet(_KDB) {
    _KDB.runtime.pageSurface.canvasFacet = readCanvasFacet(_KDB);
  }

  function __orchestrator(_KDB) {
    try {
      ensureRuntime(_KDB);
      stampCanvasFacet(_KDB);
      const controller = _createPageSurfaceController(_KDB);
      _KDB.api.canvas = {
        mount: controller.mount,
        destroy: controller.destroy,
        dispatch: controller.dispatch,
        getState: controller.getState
      };
      return _KDB.api.canvas;
    } catch (err) {
      console.error("[pageSurface.__orchestrator] init failed", err);
      throw err;
    }
  }

  return __orchestrator;
});

define([
  "./createWidgetBindingApplyService.js",
  "./config/defaults.js",
  "./runtime/ensureWidgetBindingApplyRuntime.js",
], function (_createWidgetBindingApplyService, _defaults, _ensureWidgetBindingApplyRuntime) {
  "use strict";

  function readCognosHostService(_KDB) {
    return _KDB.services && _KDB.services.cognosHost ? _KDB.services.cognosHost : null;
  }

  function stampHostFacets(_KDB) {
    var service = readCognosHostService(_KDB);
    var runtime = _KDB.runtime.widgetBindingApply;
    runtime.visualizationFacet = service && service.visualization ? service.visualization : null;
    runtime.widgetsFacet = service && service.widgets ? service.widgets : null;
    runtime.canvasFacet = service && service.canvas ? service.canvas : null;
  }

  function __orchestrator(_KDB, _options) {
    try {
      _KDB.services = _KDB.services || {};
      _ensureWidgetBindingApplyRuntime(_KDB);
      stampHostFacets(_KDB);
      var service = _createWidgetBindingApplyService({
        _KDB: _KDB,
        defaults: _defaults(),
        options: _options || {},
      });
      _KDB.services.widgetBindingApply = service;
      return service;
    } catch (error) {
      console.error("[widgetBindingApply.__orchestrator] service startup failed", error);
      throw error;
    }
  }

  return __orchestrator;
});

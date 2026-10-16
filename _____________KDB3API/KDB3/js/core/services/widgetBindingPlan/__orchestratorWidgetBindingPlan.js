define([
  "./createWidgetBindingPlanService.js",
], function (_createWidgetBindingPlanService) {
  "use strict";

  function __orchestrator(_KDB, _options) {
    try {
      _KDB.services = _KDB.services || {};
      var service = _createWidgetBindingPlanService(_options || {});
      _KDB.services.widgetBindingPlan = service;
      return service;
    } catch (error) {
      console.error("[widgetBindingPlan.__orchestrator] service startup failed", error);
      throw error;
    }
  }

  return __orchestrator;
});

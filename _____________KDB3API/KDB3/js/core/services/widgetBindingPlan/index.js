define([
  "./buildPlan.js",
], function (_buildPlan) {
  "use strict";

  function registerWidgetBindingPlan(_KDB) {
    var service = { buildPlan: _buildPlan };
    _KDB.services.widgetBindingPlan = service;
    return service;
  }

  return registerWidgetBindingPlan;
});

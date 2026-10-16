define([
  "./buildPlan.js",
], function (_buildPlan) {
  "use strict";

  function registerWidgetBindingPlan(_KDB) {
    _KDB.services = _KDB.services || {};
    var service = { buildPlan: _buildPlan };
    _KDB.services.widgetBindingPlan = service;
    return service;
  }

  return registerWidgetBindingPlan;
});

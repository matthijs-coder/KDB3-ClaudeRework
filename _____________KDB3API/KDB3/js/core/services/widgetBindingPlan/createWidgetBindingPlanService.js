define([
  "./buildPlan.js",
], function (_buildPlan) {
  "use strict";

  function buildPlan(_spec) {
    return _buildPlan(_spec);
  }

  function createWidgetBindingPlanService(_options) {
    return {
      buildPlan: buildPlan,
    };
  }

  return createWidgetBindingPlanService;
});

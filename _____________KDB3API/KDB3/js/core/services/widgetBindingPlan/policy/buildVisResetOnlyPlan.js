define([
  "../diagnostics/createPlanSuccess.js",
  "./slotsChangedPolicy.js",
], function (_createPlanSuccess, _slotsChangedPolicy) {
  "use strict";

  function __controller(_spec, _base, _emptyIntent, _resetIntent, _diagnostics) {
    return _createPlanSuccess({
      reason: _spec.reason,
      targetKind: _spec.targetKind,
      widgetId: _spec.widgetId,
      ownerWidgetId: _spec.ownerWidgetId,
      opSeq: _spec.opSeq,
      datasource: _base.datasource,
      visualization: _base.visualization,
      slots: [],
      localFilters: [],
      managedFilterItemIds: [],
      emptyIntent: _emptyIntent,
      resetIntent: _resetIntent,
      mirrorPatch: {},
      slotsChanged: _slotsChangedPolicy.computeSlotsChanged(_spec.reason, _emptyIntent),
      diagnostics: _diagnostics,
    });
  }

  return __controller;
});

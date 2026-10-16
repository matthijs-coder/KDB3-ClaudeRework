define([], function () {
  "use strict";

  function emptyIntentShape(_emptyIntent) {
    var source = _emptyIntent && typeof _emptyIntent === "object" ? _emptyIntent : {};
    return {
      enabled: source.enabled === true,
      reason: source.reason == null ? null : String(source.reason),
      itemId: source.itemId == null ? null : String(source.itemId),
      value: source.value === "1" ? "1" : null,
    };
  }

  function __controller(_spec) {
    var spec = _spec && typeof _spec === "object" ? _spec : {};
    return {
      service: "widgetBindingPlan",
      operation: "buildPlan",
      reason: spec.reason == null ? null : String(spec.reason),
      targetKind: spec.targetKind == null ? "" : String(spec.targetKind),
      widgetId: spec.widgetId == null ? null : String(spec.widgetId),
      ownerWidgetId: spec.ownerWidgetId == null ? null : String(spec.ownerWidgetId),
      opSeq: typeof spec.opSeq === "number" ? spec.opSeq : null,
      emptyIntent: emptyIntentShape(spec.emptyIntent),
      legacyError: null,
      failedStage: null,
      warnings: [],
      counts: {
        slotCount: 0,
        localFilterCount: 0,
        managedFilterCount: 0,
      },
    };
  }

  return __controller;
});

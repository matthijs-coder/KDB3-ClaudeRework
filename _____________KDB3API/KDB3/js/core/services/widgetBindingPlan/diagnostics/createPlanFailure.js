define([
  "../serialize/cloneSerializable.js",
], function (_cloneSerializable) {
  "use strict";

  var FAILURE_EMPTY_INTENT = {
    enabled: false,
    reason: null,
    itemId: null,
    value: null,
  };
  var FAILURE_RESET_INTENT = {
    enabled: false,
    scope: null,
    clearAllSlots: false,
    clearAllLocalFilters: false,
    reason: null,
  };

  function __controller(_context) {
    var context = _context && typeof _context === "object" ? _context : {};
    var diagnostics = _cloneSerializable(context.diagnostics || {});
    diagnostics.failedStage = context.failedStage || diagnostics.failedStage || null;
    diagnostics.legacyError = context.legacyError || diagnostics.legacyError || null;

    return {
      ok: false,
      status: "error",
      errorCode: context.errorCode || "WIDGET_BINDING_PLAN_INTERNAL",
      errorMessage: context.errorMessage || "Binding plan failed.",
      legacyError: context.legacyError || null,
      reason: context.reason == null ? null : String(context.reason),
      targetKind: context.targetKind || "vis",
      widgetId: context.widgetId == null ? null : String(context.widgetId),
      ownerWidgetId: context.ownerWidgetId == null ? null : String(context.ownerWidgetId),
      opSeq: typeof context.opSeq === "number" ? context.opSeq : null,
      datasource: context.datasource || null,
      visualization: context.visualization || null,
      slotsChanged: false,
      slotsToClear: [],
      slots: [],
      localFilters: [],
      managedFilterItemIds: [],
      emptyIntent: FAILURE_EMPTY_INTENT,
      resetIntent: FAILURE_RESET_INTENT,
      mirrorPatch: {},
      diagnostics: diagnostics,
    };
  }

  return __controller;
});

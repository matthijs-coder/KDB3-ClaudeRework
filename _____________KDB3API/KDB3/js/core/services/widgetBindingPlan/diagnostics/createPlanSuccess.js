define([
  "../serialize/cloneSerializable.js",
], function (_cloneSerializable) {
  "use strict";

  function __controller(_context) {
    var context = _context && typeof _context === "object" ? _context : {};
    var diagnostics = _cloneSerializable(context.diagnostics || {});
    var slots = _cloneSerializable(context.slots || []);
    var localFilters = _cloneSerializable(context.localFilters || []);
    var managedFilterItemIds = _cloneSerializable(context.managedFilterItemIds || []);
    var emptyIntent = _cloneSerializable(context.emptyIntent || {
      enabled: false,
      reason: null,
      itemId: null,
      value: null,
    });
    var resetIntent = _cloneSerializable(context.resetIntent || {
      enabled: false,
      scope: null,
      clearAllSlots: false,
      clearAllLocalFilters: false,
      reason: null,
    });

    diagnostics.counts = {
      slotCount: slots.length,
      localFilterCount: localFilters.length,
      managedFilterCount: managedFilterItemIds.length,
    };

    return {
      ok: true,
      status: "success",
      errorCode: null,
      errorMessage: null,
      reason: context.reason == null ? null : String(context.reason),
      targetKind: context.targetKind || "vis",
      widgetId: context.widgetId == null ? null : String(context.widgetId),
      ownerWidgetId: context.ownerWidgetId == null ? null : String(context.ownerWidgetId),
      opSeq: typeof context.opSeq === "number" ? context.opSeq : null,
      datasource: _cloneSerializable(context.datasource || null),
      visualization: _cloneSerializable(context.visualization || null),
      slotsChanged: context.slotsChanged === true,
      slotsToClear: context.slotsChanged === true ? ["all"] : [],
      slots: slots,
      localFilters: localFilters,
      managedFilterItemIds: managedFilterItemIds,
      emptyIntent: emptyIntent,
      resetIntent: resetIntent,
      mirrorPatch: _cloneSerializable(context.mirrorPatch || {}),
      diagnostics: diagnostics,
    };
  }

  return __controller;
});

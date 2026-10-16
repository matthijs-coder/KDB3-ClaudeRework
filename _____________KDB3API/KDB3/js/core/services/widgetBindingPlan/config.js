define([], function () {
  "use strict";

  var PLAN_TARGET_KINDS = { vis: 1, topNHelper: 1, dataTableHelper: 1 };

  var ALL_SLOT_NAMES = ["values", "categories", "series", "color", "repeatHorizontal", "repeatVertical", "grid_cols"];
  var REQUIRED_SLOTS = ["values", "categories", "series", "grid_cols"];

  // Intent shapes are returned by function so no plan result shares a mutable default.
  function emptyIntentDefault() {
    return { enabled: false, reason: null, itemId: null, value: null };
  }

  function resetIntentDefault() {
    return { enabled: false, scope: null, clearAllSlots: false, clearAllLocalFilters: false, reason: null };
  }

  return {
    PLAN_TARGET_KINDS: PLAN_TARGET_KINDS,
    PLAN_REASON_CLEANUP: "cleanup",
    PLAN_REASON_TOPN: "topn",
    PLAN_REASON_HIERARCHY_FILTER: "hierarchyfilter",
    PLAN_REASON_HIERARCHY: "hierarchy",
    PLAN_REASON_SETTINGS_DELETE: "settingsDelete",
    PLAN_REASON_POST_RESOLUTION: "postResolution",
    PLAN_REASON_TOPN_HELPER_PRE_APPLY: "topNHelperPreApply",
    PLAN_SCOPE_VIS_TARGET: "visTarget",
    PLAN_SCOPE_HELPER_TARGET: "helperTarget",
    ALL_SLOT_NAMES: ALL_SLOT_NAMES,
    REQUIRED_SLOTS: REQUIRED_SLOTS,
    emptyIntentDefault: emptyIntentDefault,
    resetIntentDefault: resetIntentDefault,
  };
});

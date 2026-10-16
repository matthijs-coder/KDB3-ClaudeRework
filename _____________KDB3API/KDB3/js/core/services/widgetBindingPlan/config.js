define([], function () {
  "use strict";

  var PLAN_TARGET_KINDS = { vis: 1, topNHelper: 1, dataTableHelper: 1 };

  var ALL_SLOT_NAMES = ["values", "categories", "series", "color", "repeatHorizontal", "repeatVertical", "grid_cols"];
  var REQUIRED_SLOTS = ["values", "categories", "series", "grid_cols"];

  // Slot-kind rules: the Cognos list slot (grid_cols) and the vis types that show only the chosen dimension
  // in one slot. Kept here, not in the slot modules, so every special case has one home.
  var SLOT_RULES = {
    grid_cols: {
      maxSortSpecs: 2,
      carriesTopBottom: true,
      hierarchyMakesSourceMixed: true,
      defaultDimensionPolicy: { mode: "prependThenMoveFirstToIndex", targetIndex: 2 },
      defaultHierarchyPolicy: { mode: "insertBeforeSelectedDimensionOrBeforeLast" }
    }
  };
  var DIMENSION_ONLY_SLOT_BY_VIS_TYPE = { pie: "categories", donut: "categories", doughnut: "categories", treemap: "categories" };
  var NO_RULE = {};

  function hasOwn(_object, _key) {
    return Object.prototype.hasOwnProperty.call(_object, _key);
  }

  function slotRule(_slotName) {
    return hasOwn(SLOT_RULES, _slotName) ? SLOT_RULES[_slotName] : NO_RULE;
  }

  // Slot that holds only the chosen dimension for this vis type, or null.
  function dimensionOnlySlot(_visualizationType) {
    var key = String(_visualizationType || "").toLowerCase();
    return hasOwn(DIMENSION_ONLY_SLOT_BY_VIS_TYPE, key) ? DIMENSION_ONLY_SLOT_BY_VIS_TYPE[key] : null;
  }

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
    slotRule: slotRule,
    dimensionOnlySlot: dimensionOnlySlot,
    emptyIntentDefault: emptyIntentDefault,
    resetIntentDefault: resetIntentDefault,
  };
});

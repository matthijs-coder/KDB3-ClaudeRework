define([
  "../config/planReasons.js",
], function (_planReasons) {
  "use strict";

  function __controller(_spec) {
    var reset = _spec.resetIntent || {};
    if (reset.enabled === true) {
      return {
        enabled: true,
        scope: reset.scope == null ? _planReasons.PLAN_SCOPE_HELPER_TARGET : String(reset.scope),
        clearAllSlots: reset.clearAllSlots !== false,
        clearAllLocalFilters: reset.clearAllLocalFilters !== false,
        reason: reset.reason == null ? null : String(reset.reason),
        rebuildAfterClear: reset.reason === "parameterSetReset" && _spec.targetKind === "vis"
          ? false
          : reset.rebuildAfterClear !== false,
      };
    }
    if (_spec.targetKind === "topNHelper") {
      return {
        enabled: true,
        scope: _planReasons.PLAN_SCOPE_HELPER_TARGET,
        clearAllSlots: true,
        clearAllLocalFilters: true,
        reason: String(_spec.reason || "").toLowerCase() === _planReasons.PLAN_REASON_CLEANUP
          ? _planReasons.PLAN_REASON_POST_RESOLUTION
          : _planReasons.PLAN_REASON_TOPN_HELPER_PRE_APPLY,
      };
    }
    return { enabled: false, scope: null, clearAllSlots: false, clearAllLocalFilters: false, reason: null };
  }

  return __controller;
});

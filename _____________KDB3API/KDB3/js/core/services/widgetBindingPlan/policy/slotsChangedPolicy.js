define([
  "../config.js",
], function (_config) {
  "use strict";

  function computeSlotsChanged(_reason, _emptyIntent) {
    var reason = (_reason == null ? "" : String(_reason)).toLowerCase();
    if (reason === _config.PLAN_REASON_TOPN
      || reason === _config.PLAN_REASON_HIERARCHY_FILTER
      || reason === _config.PLAN_REASON_HIERARCHY) {
      return false;
    }
    if (reason === _config.PLAN_REASON_CLEANUP && _emptyIntent && _emptyIntent.enabled === true) {
      return false;
    }
    return true;
  }

  function isTopNHelperResetOnlyCleanup(_spec, _resetIntent) {
    return _spec.targetKind === "topNHelper"
      && String(_spec.reason || "").toLowerCase() === _config.PLAN_REASON_CLEANUP
      && _resetIntent
      && _resetIntent.enabled === true;
  }

  function isVisResetOnlyCleanup(_spec, _resetIntent) {
    return _spec.targetKind === "vis"
      && String(_spec.reason || "").toLowerCase() === _config.PLAN_REASON_CLEANUP
      && _resetIntent
      && _resetIntent.enabled === true
      && (_resetIntent.reason === _config.PLAN_REASON_SETTINGS_DELETE
        || _resetIntent.scope === _config.PLAN_SCOPE_VIS_TARGET);
  }

  function isResetOnlyCleanup(_spec, _resetIntent) {
    return isTopNHelperResetOnlyCleanup(_spec, _resetIntent) || isVisResetOnlyCleanup(_spec, _resetIntent);
  }

  return {
    computeSlotsChanged: computeSlotsChanged,
    isVisResetOnlyCleanup: isVisResetOnlyCleanup,
    isResetOnlyCleanup: isResetOnlyCleanup,
  };
});

define([
  "./config.js",
], function (_config) {
  "use strict";

  function normalizeEmptyIntentValue(_value) {
    if (_value == null || _value === "") {
      return "1";
    }
    return String(_value).trim() === "1" ? "1" : null;
  }

  function resolveEmptyDataItemId(_spec) {
    var empty = _spec.emptyIntent || {};
    if (empty.itemId) {
      return String(empty.itemId);
    }
    var cfg = _spec.config && _spec.config.emptyDataFilter;
    if (cfg && cfg.itemId) {
      return String(cfg.itemId);
    }
    var dc = _spec.dataConfig || {};
    if (dc.emptyDataFilterItemId) {
      return String(dc.emptyDataFilterItemId);
    }
    if (dc.emptyDataFilter && dc.emptyDataFilter.itemId) {
      return String(dc.emptyDataFilter.itemId);
    }
    return null;
  }

  function resolveEmptyIntent(_spec) {
    var empty = _spec.emptyIntent;
    if (!empty || empty.enabled !== true) {
      return { ok: true, emptyIntent: _config.emptyIntentDefault() };
    }
    var itemId = resolveEmptyDataItemId(_spec);
    if (!itemId || !String(itemId).trim()) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_EMPTY_DATA_FILTER_MISSING", message: "Stop-filter item id is missing for intentional emptying." };
    }
    var forceValue = normalizeEmptyIntentValue(empty.value);
    if (!forceValue) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_EMPTY_DATA_FILTER_INVALID", message: "Stop-filter force-empty value is missing or invalid." };
    }
    return {
      ok: true,
      emptyIntent: {
        enabled: true,
        reason: empty.reason == null ? null : String(empty.reason),
        itemId: String(itemId).trim(),
        value: forceValue,
      },
    };
  }

  function resolveResetIntent(_spec) {
    var reset = _spec.resetIntent || {};
    if (reset.enabled === true) {
      return {
        enabled: true,
        scope: reset.scope == null ? _config.PLAN_SCOPE_HELPER_TARGET : String(reset.scope),
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
        scope: _config.PLAN_SCOPE_HELPER_TARGET,
        clearAllSlots: true,
        clearAllLocalFilters: true,
        reason: String(_spec.reason || "").toLowerCase() === _config.PLAN_REASON_CLEANUP
          ? _config.PLAN_REASON_POST_RESOLUTION
          : _config.PLAN_REASON_TOPN_HELPER_PRE_APPLY,
      };
    }
    return _config.resetIntentDefault();
  }

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

  function isCleanupWithReset(_spec, _resetIntent) {
    return String(_spec.reason || "").toLowerCase() === _config.PLAN_REASON_CLEANUP
      && !!_resetIntent
      && _resetIntent.enabled === true;
  }

  function isVisResetOnlyCleanup(_spec, _resetIntent) {
    return _spec.targetKind === "vis"
      && isCleanupWithReset(_spec, _resetIntent)
      && (_resetIntent.reason === _config.PLAN_REASON_SETTINGS_DELETE
        || _resetIntent.scope === _config.PLAN_SCOPE_VIS_TARGET);
  }

  function isResetOnlyCleanup(_spec, _resetIntent) {
    return (_spec.targetKind === "topNHelper" && isCleanupWithReset(_spec, _resetIntent))
      || isVisResetOnlyCleanup(_spec, _resetIntent);
  }

  return {
    resolveEmptyIntent: resolveEmptyIntent,
    resolveResetIntent: resolveResetIntent,
    computeSlotsChanged: computeSlotsChanged,
    isVisResetOnlyCleanup: isVisResetOnlyCleanup,
    isResetOnlyCleanup: isResetOnlyCleanup,
  };
});

define([], function () {
  "use strict";

  function normalizeEmptyIntentValue(_value) {
    if (_value == null || _value === "") {
      return "1";
    }
    var normalized = String(_value).trim();
    return normalized === "1" ? "1" : null;
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

  function __controller(_spec) {
    var empty = _spec.emptyIntent;
    if (!empty || empty.enabled !== true) {
      return { ok: true, emptyIntent: { enabled: false, reason: null, itemId: null, value: null } };
    }
    var itemId = resolveEmptyDataItemId(_spec);
    if (!itemId || !String(itemId).trim()) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_EMPTY_DATA_FILTER_MISSING", message: "Stop-filter item id is missing for intentional emptying." };
    }
    itemId = String(itemId).trim();
    var forceValue = normalizeEmptyIntentValue(empty.value);
    if (!forceValue) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_EMPTY_DATA_FILTER_INVALID", message: "Stop-filter force-empty value is missing or invalid." };
    }
    return {
      ok: true,
      emptyIntent: {
        enabled: true,
        reason: empty.reason == null ? null : String(empty.reason),
        itemId: itemId,
        value: forceValue,
      },
    };
  }

  return __controller;
});

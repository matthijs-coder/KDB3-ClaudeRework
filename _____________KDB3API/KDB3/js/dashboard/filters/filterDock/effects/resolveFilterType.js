define([], function () {
  "use strict";

  var SPECIAL_SINGLE_SELECT_CONDITION_KEYS = ["personengruppe", "dienststellenleitung"];

  function resolveFilterType(_capabilities) {
    if (!_capabilities) {
      return "unknown";
    }
    var conditionKey = String(_capabilities.condition || "").trim().toLowerCase();
    if (_capabilities.isUpstream && _capabilities.isSingleSelect) {
      return "sicht";
    }
    if (
      _capabilities.isSingleSelect &&
      SPECIAL_SINGLE_SELECT_CONDITION_KEYS.includes(conditionKey)
    ) {
      return "specialSingleSelect";
    }
    if (_capabilities.isSingleSelect) {
      return "singleSelect";
    }
    if (_capabilities.isHierarchy && _capabilities.isDownstream) {
      return "dienststelle";
    }
    if (_capabilities.isNative) {
      return "nativeMultiSelect";
    }
    if (!_capabilities.isSingleSelect && !_capabilities.isHierarchy) {
      return "nativeMultiSelect";
    }
    return "unknown";
  }

  return {
    resolveFilterType: resolveFilterType
  };
});

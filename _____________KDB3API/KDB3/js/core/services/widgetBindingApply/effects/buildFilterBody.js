define([
  "./buildSimpleFilterBody.js",
  "./buildOperatorFilterBody.js",
  "./filterBodyHelpers.js",
], function (_buildSimpleFilterBody, _buildOperatorFilterBody, _filterBodyHelpers) {
  "use strict";

  function __controller(_descriptor, _cognosBinding) {
    try {
      var mode = _filterBodyHelpers.toTrimmedString(_descriptor && _descriptor.mode).toLowerCase();
      var simpleModes = { forceempty: true, hierarchykeepexclude: true, include: true, reverse: true };
      var outcome;

      if (simpleModes[mode]) {
        outcome = _buildSimpleFilterBody(_descriptor, _cognosBinding);
      } else {
        outcome = _buildOperatorFilterBody(_descriptor, _cognosBinding);
      }

      if (outcome) {
        return outcome;
      }

      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_UNKNOWN_FILTER_MODE",
        errorMessage: "Unknown filter mode: " + mode,
      };
    } catch (err) {
      console.error("[widgetBindingApply.buildFilterBody] failed", { mode: _descriptor && _descriptor.mode }, err);
      throw err;
    }
  }

  return __controller;
});

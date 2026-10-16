define([
  "./filterBodyHelpers.js",
  "./buildIncludeExcludeOrFilterBody.js",
], function (_filterBodyHelpers, _buildIncludeExcludeOrFilterBody) {
  "use strict";

  function buildExcludeBody(_parsed, _buildKeepexclude) {
    var itemId = _parsed.itemId;
    var options = _parsed.options;
    var values = _parsed.values;
    var excludeBody;

    if (!values.length) {
      return { ok: true, body: null };
    }
    excludeBody = _filterBodyHelpers.invokeBuildKeepexclude(
      itemId,
      _filterBodyHelpers.buildKeepexcludeOptions(options, values, {
        mode: "exclude",
        operator: _filterBodyHelpers.toTrimmedString(options.operator) || "endswith",
        exclude: options.exclude !== false,
      }),
      _buildKeepexclude
    );
    if (!excludeBody) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_FILTER_OPERATOR_UNSUPPORTED",
        errorMessage: "exclude filter body could not be built.",
      };
    }
    return { ok: true, body: excludeBody };
  }

  function buildContainsOrBeginsWithBody(_parsed, _buildKeepexclude, _mode) {
    var itemId = _parsed.itemId;
    var options = _parsed.options;
    var values = _parsed.values;
    var operator = _mode === "contains" ? "contains" : "startswith";
    var operatorBody;

    if (!values.length) {
      return { ok: true, body: null };
    }
    if (typeof _buildKeepexclude !== "function") {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_FILTER_OPERATOR_UNSUPPORTED",
        errorMessage: "Operator " + _mode + " is unavailable.",
      };
    }
    operatorBody = _filterBodyHelpers.invokeBuildKeepexclude(
      itemId,
      _filterBodyHelpers.buildKeepexcludeOptions(options, values, {
        mode: "include",
        operator: operator,
        ignoreCase: typeof options.ignoreCase === "boolean" ? options.ignoreCase : false,
      }),
      _buildKeepexclude
    );
    if (!operatorBody) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_FILTER_OPERATOR_UNSUPPORTED",
        errorMessage: "Operator " + _mode + " could not be built.",
      };
    }
    return { ok: true, body: operatorBody };
  }

  return {
    buildExcludeBody: buildExcludeBody,
    buildContainsOrBeginsWithBody: buildContainsOrBeginsWithBody,
    buildIncludeExcludeOrBody: _buildIncludeExcludeOrFilterBody,
  };
});

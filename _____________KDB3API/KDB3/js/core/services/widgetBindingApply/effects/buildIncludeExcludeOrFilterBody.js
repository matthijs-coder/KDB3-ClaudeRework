define([
  "./filterBodyHelpers.js",
], function (_filterBodyHelpers) {
  "use strict";

  function buildIncludeExcludeOrBody(_parsed, _buildKeepexclude) {
    var itemId = _parsed.itemId;
    var options = _parsed.options;
    var includeValues = _filterBodyHelpers.toValueArray(options.includeValues);
    var excludeValues = _filterBodyHelpers.toValueArray(options.excludeValues);
    var clauses = [];
    var excludeClauseBody;

    if (!includeValues.length && !excludeValues.length) {
      return { ok: true, body: null };
    }
    if (includeValues.length) {
      clauses.push({
        operator: "in",
        itemId: itemId,
        ignoreCase: false,
        values: includeValues,
        valueType: "display",
      });
    }
    if (excludeValues.length) {
      excludeClauseBody = _filterBodyHelpers.invokeBuildKeepexclude(
        itemId,
        _filterBodyHelpers.buildKeepexcludeOptions(options, excludeValues, {
          mode: "exclude",
          operator: _filterBodyHelpers.toTrimmedString(options.excludeOperator) || "endswith",
          ignoreCase: typeof options.excludeIgnoreCase === "boolean" ? options.excludeIgnoreCase : true,
        }),
        _buildKeepexclude
      );
      if (excludeClauseBody && excludeClauseBody.conditionsInfo) {
        clauses.push(excludeClauseBody.conditionsInfo.conditions);
      } else {
        clauses.push({
          not: {
            operator: "endswith",
            itemId: itemId,
            ignoreCase: true,
            values: excludeValues,
            valueType: "display",
          },
        });
      }
    }
    return {
      ok: true,
      body: {
        exclude: false,
        values: [],
        conditionsInfo: {
          excludedValues: [],
          conditions: clauses.length > 1 ? { or: clauses } : clauses[0],
        },
        action: "keepexclude",
      },
    };
  }

  return buildIncludeExcludeOrBody;
});

define([], function () {
  "use strict";

  function buildKeepexcludeConditionsFilterObj(_itemId, _options) {
    var itemId = String(_itemId || "").trim();
    if (!itemId) {
      return null;
    }
    var options = _options && typeof _options === "object" ? _options : {};
    var modeRaw = String(options.mode || "").trim().toLowerCase();
    var mode = modeRaw === "exclude" ? "exclude" : "include";
    var operatorRaw = String(options.operator || "").trim().toLowerCase();
    var operator = operatorRaw || (mode === "exclude" ? "endswith" : "in");
    var ignoreCase = typeof options.ignoreCase === "boolean" ? options.ignoreCase : mode === "exclude";
    var valueType = String(options.valueType || "display");
    var valuesArr = Array.isArray(options.values) ? options.values : [];
    var values = [];
    var idx;
    var baseCondition;
    var isStringOp;
    var conditions;
    var filterObj;

    for (idx = 0; idx < valuesArr.length; idx += 1) {
      var value = valuesArr[idx] == null ? "" : String(valuesArr[idx]);
      if (value !== "") {
        values.push(value);
      }
    }

    baseCondition = {
      operator: operator,
      itemId: itemId,
      ignoreCase: ignoreCase,
      values: values,
      valueType: valueType,
    };
    isStringOp = operator === "endswith" || operator === "contains" || operator === "startswith";

    if (mode === "exclude" && isStringOp && values.length > 1) {
      var andArr = [];
      for (idx = 0; idx < values.length; idx += 1) {
        andArr.push({
          not: {
            operator: operator,
            itemId: itemId,
            ignoreCase: ignoreCase,
            values: [values[idx]],
            valueType: valueType,
          },
        });
      }
      conditions = { and: andArr };
    } else if (mode === "include" && isStringOp && values.length > 1) {
      var orArr = [];
      for (idx = 0; idx < values.length; idx += 1) {
        orArr.push({
          operator: operator,
          itemId: itemId,
          ignoreCase: ignoreCase,
          values: [values[idx]],
          valueType: valueType,
        });
      }
      conditions = { or: orArr };
    } else if (mode === "exclude") {
      conditions = { not: baseCondition };
    } else {
      conditions = baseCondition;
    }

    filterObj = {
      exclude: false,
      values: [],
      conditionsInfo: {
        excludedValues: [],
        conditions: conditions,
      },
      action: "keepexclude",
    };
    if (mode === "include") {
      filterObj.type = valueType;
    }
    return filterObj;
  }

  return buildKeepexcludeConditionsFilterObj;
});

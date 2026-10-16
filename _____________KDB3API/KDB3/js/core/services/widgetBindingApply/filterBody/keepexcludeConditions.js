define([], function () {
  "use strict";

  function buildStringConditions(_joiner, _operator, _itemId, _ignoreCase, _values, _valueType, _negate) {
    var list = [];
    for (var idx = 0; idx < _values.length; idx += 1) {
      var condition = {
        operator: _operator,
        itemId: _itemId,
        ignoreCase: _ignoreCase,
        values: [_values[idx]],
        valueType: _valueType,
      };
      list.push(_negate ? { not: condition } : condition);
    }
    var conditions = {};
    conditions[_joiner] = list;
    return conditions;
  }

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
    var conditions;

    for (var idx = 0; idx < valuesArr.length; idx += 1) {
      var value = valuesArr[idx] == null ? "" : String(valuesArr[idx]);
      if (value !== "") {
        values.push(value);
      }
    }

    var baseCondition = {
      operator: operator,
      itemId: itemId,
      ignoreCase: ignoreCase,
      values: values,
      valueType: valueType,
    };
    var isStringOp = operator === "endswith" || operator === "contains" || operator === "startswith";

    if (mode === "exclude" && isStringOp && values.length > 1) {
      conditions = buildStringConditions("and", operator, itemId, ignoreCase, values, valueType, true);
    } else if (mode === "include" && isStringOp && values.length > 1) {
      conditions = buildStringConditions("or", operator, itemId, ignoreCase, values, valueType, false);
    } else if (mode === "exclude") {
      conditions = { not: baseCondition };
    } else {
      conditions = baseCondition;
    }

    var filterObj = {
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

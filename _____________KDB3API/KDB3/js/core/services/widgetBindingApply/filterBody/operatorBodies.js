define([], function () {
  "use strict";

  function toTrimmedString(_value) {
    return String(_value == null ? "" : _value).trim();
  }

  function normalizeValueEntry(_entry) {
    var display;
    var use;
    if (_entry == null) {
      return "";
    }
    if (typeof _entry !== "object" || Array.isArray(_entry)) {
      return String(_entry).trim();
    }
    display = _entry.d != null ? _entry.d : _entry.display != null ? _entry.display : _entry.displayValue;
    use = _entry.u != null ? _entry.u : _entry.use != null ? _entry.use : _entry.useValue;
    if (display == null && use == null) {
      return "";
    }
    return { d: String(display != null ? display : use), u: String(use != null ? use : display) };
  }

  function toValueArray(_value) {
    if (Array.isArray(_value)) {
      return _value.map(normalizeValueEntry).filter(function (entry) {
        return entry !== null && entry !== "";
      });
    }
    if (_value == null) {
      return [];
    }
    var normalized = normalizeValueEntry(_value);
    return normalized ? [normalized] : [];
  }

  function buildKeepexcludeOptions(_options, _values, _overrides) {
    var merged = {
      ignoreCase: typeof _options.ignoreCase === "boolean" ? _options.ignoreCase : true,
      valueType: toTrimmedString(_options.valueType) || "display",
      values: _values.slice(),
    };
    return Object.assign(merged, _overrides);
  }

  function invokeBuildKeepexclude(_itemId, _options, _buildKeepexclude) {
    return typeof _buildKeepexclude === "function" ? _buildKeepexclude(_itemId, _options) : null;
  }

  function operatorUnsupported(_message) {
    return { ok: false, errorCode: "WIDGET_BINDING_APPLY_FILTER_OPERATOR_UNSUPPORTED", errorMessage: _message };
  }

  function buildExcludeBody(_parsed, _buildKeepexclude) {
    var options = _parsed.options;
    if (!_parsed.values.length) {
      return { ok: true, body: null };
    }
    var excludeBody = invokeBuildKeepexclude(
      _parsed.itemId,
      buildKeepexcludeOptions(options, _parsed.values, {
        mode: "exclude",
        operator: toTrimmedString(options.operator) || "endswith",
        exclude: options.exclude !== false,
      }),
      _buildKeepexclude
    );
    if (!excludeBody) {
      return operatorUnsupported("exclude filter body could not be built.");
    }
    return { ok: true, body: excludeBody };
  }

  function buildContainsOrBeginsWithBody(_parsed, _buildKeepexclude) {
    var options = _parsed.options;
    var mode = _parsed.mode;
    if (!_parsed.values.length) {
      return { ok: true, body: null };
    }
    if (typeof _buildKeepexclude !== "function") {
      return operatorUnsupported("Operator " + mode + " is unavailable.");
    }
    var operatorBody = invokeBuildKeepexclude(
      _parsed.itemId,
      buildKeepexcludeOptions(options, _parsed.values, {
        mode: "include",
        operator: mode === "contains" ? "contains" : "startswith",
        ignoreCase: typeof options.ignoreCase === "boolean" ? options.ignoreCase : false,
      }),
      _buildKeepexclude
    );
    if (!operatorBody) {
      return operatorUnsupported("Operator " + mode + " could not be built.");
    }
    return { ok: true, body: operatorBody };
  }

  function buildExcludeClause(_itemId, _options, _excludeValues, _buildKeepexclude) {
    var excludeClauseBody = invokeBuildKeepexclude(
      _itemId,
      buildKeepexcludeOptions(_options, _excludeValues, {
        mode: "exclude",
        operator: toTrimmedString(_options.excludeOperator) || "endswith",
        ignoreCase: typeof _options.excludeIgnoreCase === "boolean" ? _options.excludeIgnoreCase : true,
      }),
      _buildKeepexclude
    );
    if (excludeClauseBody && excludeClauseBody.conditionsInfo) {
      return excludeClauseBody.conditionsInfo.conditions;
    }
    return {
      not: { operator: "endswith", itemId: _itemId, ignoreCase: true, values: _excludeValues, valueType: "display" },
    };
  }

  function buildIncludeExcludeOrBody(_parsed, _buildKeepexclude) {
    var itemId = _parsed.itemId;
    var options = _parsed.options;
    var includeValues = toValueArray(options.includeValues);
    var excludeValues = toValueArray(options.excludeValues);
    var clauses = [];

    if (!includeValues.length && !excludeValues.length) {
      return { ok: true, body: null };
    }
    if (includeValues.length) {
      clauses.push({ operator: "in", itemId: itemId, ignoreCase: false, values: includeValues, valueType: "display" });
    }
    if (excludeValues.length) {
      clauses.push(buildExcludeClause(itemId, options, excludeValues, _buildKeepexclude));
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

  // Returns null for a mode this router does not know.
  function buildOperatorFilterBody(_parsed, _buildKeepexclude, _missingItemIdError) {
    if (!_parsed.itemId) {
      return _missingItemIdError();
    }
    if (_parsed.mode === "exclude") {
      return buildExcludeBody(_parsed, _buildKeepexclude);
    }
    if (_parsed.mode === "contains" || _parsed.mode === "beginswith") {
      return buildContainsOrBeginsWithBody(_parsed, _buildKeepexclude);
    }
    if (_parsed.mode === "includeexcludeor") {
      return buildIncludeExcludeOrBody(_parsed, _buildKeepexclude);
    }
    return null;
  }

  return {
    toTrimmedString: toTrimmedString,
    toValueArray: toValueArray,
    buildOperatorFilterBody: buildOperatorFilterBody,
  };
});

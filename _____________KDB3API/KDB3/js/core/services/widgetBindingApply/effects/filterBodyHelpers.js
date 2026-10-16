define([], function () {
  "use strict";

  function toValueArray(_value) {
    if (Array.isArray(_value)) {
      return _value
        .map(function (entry) {
          return normalizeValueEntry(entry);
        })
        .filter(function (entry) {
          return entry !== null && entry !== "";
        });
    }
    if (_value == null) {
      return [];
    }
    var normalized = normalizeValueEntry(_value);
    return normalized ? [normalized] : [];
  }

  function normalizeValueEntry(entry) {
    var display;
    var use;
    if (entry == null) {
      return "";
    }
    if (typeof entry !== "object" || Array.isArray(entry)) {
      return String(entry).trim();
    }
    display = entry.d != null ? entry.d : entry.display != null ? entry.display : entry.displayValue;
    use = entry.u != null ? entry.u : entry.use != null ? entry.use : entry.useValue;
    if (display == null && use == null) {
      return "";
    }
    return { d: String(display != null ? display : use), u: String(use != null ? use : display) };
  }

  function toTrimmedString(_value) {
    return String(_value == null ? "" : _value).trim();
  }

  function invokeBuildKeepexclude(_itemId, _options, _buildKeepexclude) {
    if (typeof _buildKeepexclude === "function") {
      return _buildKeepexclude(_itemId, _options);
    }
    return null;
  }

  function parseFilterDescriptor(_descriptor) {
    var descriptor = _descriptor || {};
    return {
      mode: toTrimmedString(descriptor.mode).toLowerCase(),
      itemId: toTrimmedString(descriptor.itemId),
      options: descriptor.options && typeof descriptor.options === "object" ? descriptor.options : {},
      values: toValueArray(descriptor.values),
    };
  }

  function buildKeepexcludeOptions(_options, _values, _overrides) {
    var options = _options && typeof _options === "object" ? _options : {};
    var merged = {
      ignoreCase: typeof options.ignoreCase === "boolean" ? options.ignoreCase : true,
      valueType: toTrimmedString(options.valueType) || "display",
      values: _values.slice(),
    };
    if (_overrides && typeof _overrides === "object") {
      var keys = Object.keys(_overrides);
      for (var index = 0; index < keys.length; index += 1) {
        merged[keys[index]] = _overrides[keys[index]];
      }
    }
    return merged;
  }

  function missingFilterItemIdError() {
    return {
      ok: false,
      errorCode: "WIDGET_BINDING_APPLY_LOCAL_FILTER_FAILED",
      errorMessage: "Filter descriptor missing itemId.",
    };
  }

  return {
    toValueArray: toValueArray,
    toTrimmedString: toTrimmedString,
    parseFilterDescriptor: parseFilterDescriptor,
    invokeBuildKeepexclude: invokeBuildKeepexclude,
    buildKeepexcludeOptions: buildKeepexcludeOptions,
    missingFilterItemIdError: missingFilterItemIdError,
  };
});

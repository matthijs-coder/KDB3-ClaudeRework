define([], function () {
  "use strict";

  function copiedHostDisplay(_entry) {
    if (!_entry || _entry.hostDisplay == null || String(_entry.hostDisplay) === "") {
      return "";
    }
    return String(_entry.hostDisplay);
  }

  function copyValueEntry(_entry) {
    return {
      displayValue: _entry.displayValue != null ? String(_entry.displayValue) : "",
      useValue: _entry.useValue != null ? String(_entry.useValue) : "",
      source: _entry.source || "cognos",
      hostDisplay: copiedHostDisplay(_entry)
    };
  }

  function copyValues(_values) {
    var out = [];
    var idx;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      out.push(copyValueEntry(_values[idx]));
    }
    return out;
  }

  return copyValues;
});

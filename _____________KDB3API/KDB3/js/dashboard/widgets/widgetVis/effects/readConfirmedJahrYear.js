define([], function () {
  "use strict";

  function __controller(_values) {
    try {
      var maxYear = null;
      var index;
      var year;
      var list = _values || [];
      for (index = 0; index < list.length; index += 1) {
        year = yearFromValue(list[index]);
        if (year != null && (maxYear == null || year > maxYear)) {
          maxYear = year;
        }
      }
      return maxYear;
    } catch (err) {
      console.error("[widgetVis.readConfirmedJahrYear]", err);
      return null;
    }
  }

  function yearFromValue(_value) {
    var fromDisplay;
    if (_value && typeof _value === "object") {
      fromDisplay = yearFromText(_value.d);
      return fromDisplay != null ? fromDisplay : yearFromText(_value.u);
    }
    return yearFromText(_value);
  }

  function yearFromText(_raw) {
    var text;
    var year;
    var match;
    if (_raw == null || _raw === "") {
      return null;
    }
    text = String(_raw).trim();
    year = parseInt(text, 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
    match = text.match(/(\d{4})/);
    year = match ? parseInt(match[1], 10) : NaN;
    if (year >= 1900 && year <= 2100) {
      return year;
    }
    return null;
  }

  return __controller;
});

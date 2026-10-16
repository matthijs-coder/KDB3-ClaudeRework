define([], function () {
  "use strict";

  function isYearInRange(_year) {
    return _year >= 1900 && _year <= 2100;
  }

  // match "first" takes the first 4-digit run, "last" the last one (cells such as "2019 bis 2021").
  function parseYear(_text, _options) {
    var text;
    var year;
    var match;
    if (_text == null || _text === "") {
      return null;
    }
    text = String(_text).trim();
    year = parseInt(text, 10);
    if (isYearInRange(year)) {
      return year;
    }
    if (_options && _options.match === "last") {
      match = text.match(/(\d{4})/g);
      year = match ? parseInt(match[match.length - 1], 10) : NaN;
    } else {
      match = text.match(/(\d{4})/);
      year = match ? parseInt(match[1], 10) : NaN;
    }
    return isYearInRange(year) ? year : null;
  }

  function parseYearFromCell(_raw) {
    try {
      var fields;
      var index;
      var year;
      if (_raw && typeof _raw === "object") {
        fields = [_raw.d, _raw.display, _raw.displayValue, _raw.u, _raw.use, _raw.useValue];
      } else {
        fields = [_raw];
      }
      for (index = 0; index < fields.length; index += 1) {
        if (fields[index] == null || fields[index] === "") {
          continue;
        }
        year = parseYear(String(fields[index]), { match: "last" });
        if (year != null) {
          return year;
        }
      }
      return null;
    } catch (err) {
      console.error("[widgetVis.parseYearFromCell]", err);
      return null;
    }
  }

  return {
    parseYear: parseYear,
    parseYearFromCell: parseYearFromCell
  };
});

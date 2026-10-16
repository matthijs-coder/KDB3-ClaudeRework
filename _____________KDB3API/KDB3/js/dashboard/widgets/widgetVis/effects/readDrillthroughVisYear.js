define([], function () {
  "use strict";

  function readDataQueryStamp(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    return rt && rt.dataQueryFacet ? rt.dataQueryFacet : null;
  }

  function parseYearFromCell(_raw) {
    try {
      var fields;
      var index;
      var text;
      var year;
      var match;
      if (_raw && typeof _raw === "object") {
        fields = [_raw.d, _raw.display, _raw.displayValue, _raw.u, _raw.use, _raw.useValue];
      } else {
        fields = [_raw];
      }
      for (index = 0; index < fields.length; index += 1) {
        if (fields[index] == null || fields[index] === "") {
          continue;
        }
        text = String(fields[index]);
        year = parseInt(text, 10);
        if (year >= 1900 && year <= 2100) {
          return year;
        }
        match = text.match(/(\d{4})/g);
        year = match ? parseInt(match[match.length - 1], 10) : NaN;
        if (year >= 1900 && year <= 2100) {
          return year;
        }
      }
      return null;
    } catch (err) {
      console.error("[widgetVis.readDrillthroughVisYear]", err);
      return null;
    }
  }

  function findJahrColumnName(_columnNames) {
    try {
      var index;
      var name;
      var lowered;
      if (!Array.isArray(_columnNames)) {
        return null;
      }
      for (index = 0; index < _columnNames.length; index += 1) {
        name = _columnNames[index];
        if (name == null) {
          continue;
        }
        lowered = String(name).toLowerCase();
        if (lowered.indexOf("jahr") !== -1 || lowered.indexOf("year") !== -1) {
          return name;
        }
      }
      return null;
    } catch (err) {
      console.error("[widgetVis.readDrillthroughVisYear]", err);
      return null;
    }
  }

  function maxYearFromTableRows(_rows) {
    try {
      var columnName;
      var cells;
      var index;
      var year;
      var maxYear;
      if (!_rows || !_rows.columns) {
        return null;
      }
      columnName = findJahrColumnName(_rows.columnNames);
      if (!columnName) {
        return null;
      }
      cells = _rows.columns[columnName];
      if (!Array.isArray(cells)) {
        return null;
      }
      maxYear = null;
      for (index = 0; index < cells.length; index += 1) {
        year = parseYearFromCell(cells[index]);
        if (year != null) {
          maxYear = maxYear == null ? year : Math.max(maxYear, year);
        }
      }
      return maxYear;
    } catch (err) {
      console.error("[widgetVis.readDrillthroughVisYear]", err);
      return null;
    }
  }

  function __controller(_KDB, _widgetId) {
    try {
      var facet = readDataQueryStamp(_KDB);
      var outcome;
      if (!facet || typeof facet.peekQueryRows !== "function") {
        return null;
      }
      outcome = facet.peekQueryRows(_widgetId);
      if (outcome && typeof outcome.then === "function") {
        return null;
      }
      if (!outcome || outcome.ok !== true || !outcome.data) {
        return null;
      }
      return maxYearFromTableRows(outcome.data);
    } catch (err) {
      console.error("[widgetVis.readDrillthroughVisYear]", err);
      return null;
    }
  }

  return __controller;
});

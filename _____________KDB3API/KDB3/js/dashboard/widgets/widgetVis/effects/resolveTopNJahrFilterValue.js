define([
  "../../../../core/config/visualizations/topNHelper.js",
  "./reloadNewestStichtagPeriodPin.js"
], function (_topNHelperConfig, _reloadNewestStichtagPeriodPin) {
  "use strict";

  var STICHTAG_UNAVAILABLE = "WIDGET_TOPN_STICHTAG_UNAVAILABLE";
  var CELL_FIELDS = ["d", "display", "label", "caption", "value", "v", "u"];

  function stichtagUnavailable(_errorMessage) {
    return {
      errorCode: STICHTAG_UNAVAILABLE,
      errorMessage: String(_errorMessage || "NewestStichtag period pin is unavailable.")
    };
  }
  function rejectStichtagUnavailable(_errorMessage) {
    return Promise.reject(stichtagUnavailable(_errorMessage));
  }
  function readPinRow(_reloadResult) {
    var first = Array.isArray(_reloadResult) ? _reloadResult[0] : null;
    var row = Array.isArray(first) ? (first[0] || null) : first;
    if (!row || typeof row !== "object") {
      throw stichtagUnavailable("NewestStichtag leftover widget is missing or returned no rows.");
    }
    return row;
  }

  function readCellText(_cell) {
    var index;
    var raw;
    if (_cell == null || _cell === "") {
      return "";
    }
    if (typeof _cell !== "object") {
      return String(_cell);
    }
    for (index = 0; index < CELL_FIELDS.length; index += 1) {
      raw = _cell[CELL_FIELDS[index]];
      if (raw == null || raw === "") {
        continue;
      }
      return String(raw);
    }
    return "";
  }
  function readYear(_text) {
    var text = String(_text == null ? "" : _text).trim();
    var year;
    if (!/^\d{4}/.test(text)) {
      return null;
    }
    if (text.length > 4 && /\d/.test(text.charAt(4))) {
      return null;
    }
    year = parseInt(text.slice(0, 4), 10);
    if (year >= 1900 && year <= 2100) {
      return String(year);
    }
    return null;
  }
  function canonicalMonth(_text, _monthMap) {
    var text = String(_text == null ? "" : _text).trim();
    var upper = text.toUpperCase();
    var keys;
    var index;
    if (!_monthMap || typeof _monthMap !== "object") {
      return null;
    }
    if (_monthMap[text] || _monthMap[upper]) {
      return _monthMap[text] || _monthMap[upper];
    }
    keys = Object.keys(_monthMap);
    for (index = 0; index < keys.length; index += 1) {
      if (String(_monthMap[keys[index]]).toUpperCase() === upper) {
        return _monthMap[keys[index]];
      }
    }
    return null;
  }
  function mapPeriodPin(_row) {
    try {
      var keys = Object.keys(_row);
      var yearText;
      var monthText;
      var year;
      var monthCaption;
      var pin;
      if (keys.length < 2) {
        throw stichtagUnavailable("NewestStichtag row does not have Jahr and Monat columns.");
      }
      yearText = readCellText(_row[keys[0]]);
      monthText = readCellText(_row[keys[1]]);
      year = readYear(yearText);
      if (!year) {
        throw stichtagUnavailable("NewestStichtag Jahr column is not a four-digit year.");
      }
      monthCaption = canonicalMonth(monthText, _topNHelperConfig.monthCodeToCaption);
      if (!monthCaption) {
        throw stichtagUnavailable("NewestStichtag Monat column is not a known month caption.");
      }
      pin = {
        jahrFilterValue: { d: year, u: year },
        monatFilterValue: { d: String(monthCaption), u: String(monthCaption) }
      };
      return pin;
    } catch (err) {
      if (err && err.errorCode === STICHTAG_UNAVAILABLE) {
        throw err;
      }
      console.error("[widgetVis.mapPeriodPin] failed", err);
      throw err;
    }
  }

  function buildPeriodPinFromReload(_reloadResult) {
    try {
      return mapPeriodPin(readPinRow(_reloadResult));
    } catch (err) {
      if (err && err.errorCode === STICHTAG_UNAVAILABLE) {
        throw err;
      }
      console.error("[widgetVis.buildPeriodPinFromReload] failed", err);
      throw stichtagUnavailable(err && err.message ? err.message : err);
    }
  }

  function resolveTopNJahrFilterValue(_KDB) {
    try {
      return _reloadNewestStichtagPeriodPin(_KDB).then(buildPeriodPinFromReload);
    } catch (err) {
      console.error("[widgetVis.resolveTopNJahrFilterValue] failed", err);
      return rejectStichtagUnavailable(err && err.message ? err.message : err);
    }
  }

  return resolveTopNJahrFilterValue;
});

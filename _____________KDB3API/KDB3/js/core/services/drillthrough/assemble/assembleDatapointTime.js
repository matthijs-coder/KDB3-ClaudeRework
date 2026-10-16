define([
  "../config/monthLabels.js"
], function (_monthLabels) {
  "use strict";

  function isJahrToken(_text) {
    var text = String(_text || "").toLowerCase();
    return text.indexOf("jahr") !== -1 || text.indexOf("year") !== -1;
  }

  function readJahrNumber(_cat) {
    var cat = _cat && typeof _cat === "object" ? _cat : {};
    var fromLabel = parseInt(String(cat.label), 10);
    var fromValue;
    if (!isNaN(fromLabel)) {
      return fromLabel;
    }
    fromValue = parseInt(String(cat.value), 10);
    if (!isNaN(fromValue) && fromValue >= 1900 && fromValue <= 2100) {
      return fromValue;
    }
    return null;
  }

  function mapMonthLabelToNumber(_label, _value) {
    var numeric;
    var raw;
    if (_value != null) {
      numeric = parseInt(String(_value), 10);
      if (!isNaN(numeric) && numeric >= 1 && numeric <= 12) {
        return numeric;
      }
    }
    if (!_label) {
      return null;
    }
    raw = String(_label).trim().toLowerCase().replace(".", "");
    if (_monthLabels[raw] != null) {
      return _monthLabels[raw];
    }
    numeric = parseInt(raw, 10);
    if (!isNaN(numeric) && numeric >= 1 && numeric <= 12) {
      return numeric;
    }
    return null;
  }

  function extractYearMonth(_categories) {
    var cats = Array.isArray(_categories) ? _categories : [];
    var jahr = null;
    var monatNumber = null;
    var i;
    var cat;
    var identifier;
    var yearNum;
    var monthNum;
    for (i = 0; i < cats.length; i += 1) {
      cat = cats[i] || {};
      identifier = String(cat.columnId || cat.dataItemId || cat.name || "").toLowerCase();
      if (isJahrToken(identifier)) {
        yearNum = readJahrNumber(cat);
        if (yearNum != null) {
          jahr = yearNum;
        }
      }
      if (identifier.indexOf("monat") !== -1 || identifier.indexOf("month") !== -1) {
        monthNum = mapMonthLabelToNumber(cat.label, cat.label);
        if (monthNum != null) {
          monatNumber = monthNum;
        }
      }
    }
    return { jahr: jahr, monatNumber: monatNumber };
  }

  function __controller(_spec, _warnings) {
    try {
      var spec = _spec && typeof _spec === "object" ? _spec : {};
      var extracted = extractYearMonth(spec.categories);
      var range = "";
      var aktmon = "";
      if (extracted.jahr != null && extracted.monatNumber != null) {
        aktmon = String(extracted.jahr) + " - " + String(extracted.monatNumber);
      } else if (extracted.jahr != null) {
        range = "ja_kalenderJahr";
        aktmon = String(extracted.jahr) + " - 1";
      }
      return {
        p_range_DrillFromGDB: range,
        p_aktmon_DrillFromGDB: aktmon
      };
    } catch (err) {
      console.error("[drillthrough.assembleDatapointTime]", err);
      throw err;
    }
  }

  return __controller;
});

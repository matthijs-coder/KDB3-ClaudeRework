define([
  "./config.js"
], function (_config) {
  "use strict";

  var DATAPOINT_CATEGORIES_ERROR = "DRILLTHROUGH_DATAPOINT_CATEGORIES";

  function pushWarning(_warnings, _code, _message) {
    if (Array.isArray(_warnings)) {
      _warnings.push({ code: _code, message: _message });
    }
  }

  function readSpec(_spec) {
    return _spec && typeof _spec === "object" ? _spec : {};
  }

  function warnMissingIdentity(_spec, _warnings) {
    var code = _spec.kennzahlCode == null ? "" : String(_spec.kennzahlCode);
    var art = _spec.sicht == null ? "" : String(_spec.sicht);
    if (!code) {
      pushWarning(_warnings, "DRILLTHROUGH_KENNZAHL_OMITTED", "kennzahlCode empty");
    }
    if (!art.trim()) {
      pushWarning(_warnings, "DRILLTHROUGH_SICHT_OMITTED", "sicht empty");
    }
    return { code: code, art: art };
  }

  function normalizeVisType(_visType) {
    var visType = String(_visType || "").toLowerCase().trim();
    return visType === "list" ? "table" : visType;
  }

  function formatAktmon(_year, _month) {
    return String(_year) + " - " + String(_month);
  }

  // Returns the Aufriss value, "" for a matcher without a value (e.g. dienststelle with unknown sicht), null when nothing matches.
  function matchAufriss(_text, _sicht, _iconOnly) {
    var haystack = String(_text || "").toLowerCase();
    var matchers = _config.aufrissMatchers;
    var i;
    var n;
    var matcher;
    var mapped;
    for (i = 0; i < matchers.length; i += 1) {
      matcher = matchers[i];
      if (matcher.iconOnly && !_iconOnly) {
        continue;
      }
      for (n = 0; n < matcher.needles.length; n += 1) {
        if (haystack.indexOf(matcher.needles[n].toLowerCase()) !== -1) {
          mapped = typeof matcher.value === "function" ? matcher.value(_sicht) : matcher.value;
          return mapped == null ? "" : String(mapped);
        }
      }
    }
    return null;
  }

  function assembleIconAufriss(_spec, _warnings) {
    var visType = normalizeVisType(_spec.visType);
    var dimText = String(_spec.selectedDimension == null ? "" : _spec.selectedDimension).trim();
    var dimLower = dimText.toLowerCase();
    var isPresent = dimText !== "" && dimLower !== "default" && dimLower !== "none";
    var mapped = isPresent ? matchAufriss(dimText, _spec.sicht, true) : "";
    var p1;
    var p2 = "";
    if (mapped == null) {
      mapped = "";
    }
    if (isPresent && mapped === "") {
      pushWarning(_warnings, "DRILLTHROUGH_AUFRISS_UNMAPPED", "dimension did not map");
    }
    if (visType === "line" || visType === "table") {
      p1 = "F_TST_SID";
      p2 = mapped;
    } else if (visType === "pie") {
      p1 = isPresent ? mapped : "GESCHLECHT";
    } else {
      p1 = mapped;
    }
    return { p_aufspannen_1: p1 || "", p_aufspannen_2: p2 || "" };
  }

  function categoryMatchText(_cat) {
    var cat = _cat && typeof _cat === "object" ? _cat : {};
    return String(cat.columnId || cat.dataItemId || cat.name || "");
  }

  function assembleDatapointAufriss(_spec) {
    var categories = _spec.categories;
    var i;
    var mapped;
    for (i = 0; i < categories.length; i += 1) {
      mapped = matchAufriss(categoryMatchText(categories[i]), _spec.sicht, false);
      if (mapped != null) {
        return mapped;
      }
    }
    return "";
  }

  function isMag(_sel) {
    return String((_sel && (_sel.idValue || _sel.displayValue)) || "").trim().toLowerCase() === "mag";
  }

  function isMagOnly(_orgSelection) {
    var selectedValues = _orgSelection && Array.isArray(_orgSelection.selectedValues) ? _orgSelection.selectedValues : [];
    return selectedValues.length > 0 && selectedValues.every(isMag);
  }

  function coerceYear(_value) {
    var year;
    if (_value == null || _value === "") {
      return null;
    }
    year = Number(_value);
    return isNaN(year) ? null : year;
  }

  function readSingleYear(_ctx) {
    if (_ctx.highestYearFromVis != null) {
      return coerceYear(_ctx.highestYearFromVis);
    }
    if (_ctx.highestYearFromJahrFilter != null) {
      return coerceYear(_ctx.highestYearFromJahrFilter);
    }
    if (_ctx.defaultYear != null) {
      return coerceYear(_ctx.defaultYear);
    }
    return null;
  }

  function assembleIconTime(_spec, _warnings) {
    var visType = normalizeVisType(_spec.visType);
    var ctx = _spec.yearContext && typeof _spec.yearContext === "object" ? _spec.yearContext : {};
    var year;
    var range = "";
    var aktmon = "";
    if (visType === "line" || visType === "table") {
      if (coerceYear(ctx.highestYearFromVis) != null) {
        range = "ja_bisMaxStichtag";
        aktmon = formatAktmon(coerceYear(ctx.highestYearFromVis), 1);
      } else {
        year = coerceYear(ctx.highestYearFromJahrFilter);
        if (year == null) {
          year = coerceYear(ctx.defaultYear);
        }
        if (year != null) {
          range = "ja_kalenderJahr";
          aktmon = formatAktmon(year, 1);
        }
      }
    } else {
      year = readSingleYear(ctx);
      if (year != null) {
        range = "ja_kalenderJahr";
        aktmon = formatAktmon(year, 1);
      }
    }
    if (!range && !aktmon) {
      pushWarning(_warnings, "DRILLTHROUGH_YEAR_OMITTED", "no year resolved");
    }
    return { p_range_DrillFromGDB: range, p_aktmon_DrillFromGDB: aktmon };
  }

  function readCategoryYear(_cat) {
    var fromLabel = parseInt(String(_cat.label), 10);
    var fromValue;
    if (!isNaN(fromLabel)) {
      return fromLabel;
    }
    fromValue = parseInt(String(_cat.value), 10);
    return !isNaN(fromValue) && fromValue >= 1900 && fromValue <= 2100 ? fromValue : null;
  }

  function readCategoryMonth(_label) {
    var numeric;
    var raw;
    if (_label != null) {
      numeric = parseInt(String(_label), 10);
      if (!isNaN(numeric) && numeric >= 1 && numeric <= 12) {
        return numeric;
      }
    }
    if (!_label) {
      return null;
    }
    raw = String(_label).trim().toLowerCase().replace(".", "");
    if (_config.monthLabels[raw] != null) {
      return _config.monthLabels[raw];
    }
    numeric = parseInt(raw, 10);
    return !isNaN(numeric) && numeric >= 1 && numeric <= 12 ? numeric : null;
  }

  function extractYearMonth(_categories) {
    var jahr = null;
    var month = null;
    var i;
    var cat;
    var identifier;
    var parsed;
    for (i = 0; i < _categories.length; i += 1) {
      cat = _categories[i] || {};
      identifier = String(cat.columnId || cat.dataItemId || cat.name || "").toLowerCase();
      if (identifier.indexOf("jahr") !== -1 || identifier.indexOf("year") !== -1) {
        parsed = readCategoryYear(cat);
        if (parsed != null) {
          jahr = parsed;
        }
      }
      if (identifier.indexOf("monat") !== -1 || identifier.indexOf("month") !== -1) {
        parsed = readCategoryMonth(cat.label);
        if (parsed != null) {
          month = parsed;
        }
      }
    }
    return { jahr: jahr, month: month };
  }

  function assembleDatapointTime(_spec) {
    var extracted = extractYearMonth(_spec.categories);
    if (extracted.jahr != null && extracted.month != null) {
      return { p_range_DrillFromGDB: "", p_aktmon_DrillFromGDB: formatAktmon(extracted.jahr, extracted.month) };
    }
    if (extracted.jahr != null) {
      return { p_range_DrillFromGDB: "ja_kalenderJahr", p_aktmon_DrillFromGDB: formatAktmon(extracted.jahr, 1) };
    }
    return { p_range_DrillFromGDB: "", p_aktmon_DrillFromGDB: "" };
  }

  function assembleIconDrillConfig(_spec, _warnings) {
    var spec = readSpec(_spec);
    var identity = warnMissingIdentity(spec, _warnings);
    var aufriss = assembleIconAufriss(spec, _warnings);
    var time = assembleIconTime(spec, _warnings);
    return {
      Kennzahl_Code: identity.code,
      p_art: identity.art,
      p_datenart: _config.datenart.HASH,
      p_gruppe_drillFromGDB: "",
      p_dienststelle_drillFromGDB: "",
      p_dezpv_drillFromGDB: "",
      p_range_DrillFromGDB: time.p_range_DrillFromGDB || "",
      p_aktmon_DrillFromGDB: time.p_aktmon_DrillFromGDB || "",
      p_aufspannen_1: aufriss.p_aufspannen_1 || "",
      p_aufspannen_2: aufriss.p_aufspannen_2 || "",
      source: "icon"
    };
  }

  // The datapoint config has no p_aufspannen_2; the caller fills it with "".
  function assembleDatapointDrillConfig(_spec, _warnings) {
    var spec = readSpec(_spec);
    var identity;
    var aufriss;
    var time;
    if (!Array.isArray(spec.categories)) {
      return { errorCode: DATAPOINT_CATEGORIES_ERROR };
    }
    identity = warnMissingIdentity(spec, _warnings);
    aufriss = assembleDatapointAufriss(spec);
    if (isMagOnly(spec.orgSelection) && aufriss === "DIENSTSTELLE_LANG_SID") {
      aufriss = "";
    }
    time = assembleDatapointTime(spec);
    return {
      Kennzahl_Code: identity.code,
      p_art: identity.art,
      p_datenart: _config.datenart.HASH,
      p_gruppe_drillFromGDB: "",
      p_dienststelle_drillFromGDB: "",
      p_dezpv_drillFromGDB: "",
      p_range_DrillFromGDB: time.p_range_DrillFromGDB || "",
      p_aktmon_DrillFromGDB: time.p_aktmon_DrillFromGDB || "",
      p_aufspannen_1: aufriss || "",
      source: "datapoint"
    };
  }

  return {
    assembleIconDrillConfig: assembleIconDrillConfig,
    assembleDatapointDrillConfig: assembleDatapointDrillConfig
  };
});

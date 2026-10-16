define([], function () {
  "use strict";

  function coerceYear(_value) {
    var year;
    if (_value == null || _value === "") {
      return null;
    }
    year = Number(_value);
    return isNaN(year) ? null : year;
  }

  function readYear(_yearContext) {
    var ctx = _yearContext && typeof _yearContext === "object" ? _yearContext : {};
    if (ctx.highestYearFromVis != null) {
      return coerceYear(ctx.highestYearFromVis);
    }
    if (ctx.highestYearFromJahrFilter != null) {
      return coerceYear(ctx.highestYearFromJahrFilter);
    }
    if (ctx.defaultYear != null) {
      return coerceYear(ctx.defaultYear);
    }
    return null;
  }

  function formatAktmon(_year) {
    return String(_year) + " - 1";
  }

  function __controller(_spec, _warnings) {
    try {
      var spec = _spec && typeof _spec === "object" ? _spec : {};
      var visType = String(spec.visType || "").toLowerCase().trim();
      var ctx = spec.yearContext && typeof spec.yearContext === "object" ? spec.yearContext : {};
      var visYear;
      var filterYear;
      var defaultYear;
      var year;
      var range = "";
      var aktmon = "";
      if (visType === "list") {
        visType = "table";
      }
      if (visType === "line" || visType === "table") {
        visYear = coerceYear(ctx.highestYearFromVis);
        filterYear = coerceYear(ctx.highestYearFromJahrFilter);
        defaultYear = coerceYear(ctx.defaultYear);
        if (visYear != null) {
          range = "ja_bisMaxStichtag";
          aktmon = formatAktmon(visYear);
        } else if (filterYear != null) {
          range = "ja_kalenderJahr";
          aktmon = formatAktmon(filterYear);
        } else if (defaultYear != null) {
          range = "ja_kalenderJahr";
          aktmon = formatAktmon(defaultYear);
        }
      } else {
        year = readYear(ctx);
        if (year != null) {
          range = "ja_kalenderJahr";
          aktmon = formatAktmon(year);
        }
      }
      if (!range && !aktmon && Array.isArray(_warnings)) {
        _warnings.push({
          code: "DRILLTHROUGH_YEAR_OMITTED",
          message: "no year resolved"
        });
      }
      return {
        p_range_DrillFromGDB: range,
        p_aktmon_DrillFromGDB: aktmon
      };
    } catch (err) {
      console.error("[drillthrough.assembleIconTime]", err);
      throw err;
    }
  }

  return __controller;
});

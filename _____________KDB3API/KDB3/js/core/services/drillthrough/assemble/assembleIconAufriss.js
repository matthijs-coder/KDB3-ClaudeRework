define([
  "../config/aufrissMaps.js"
], function (_aufrissMaps) {
  "use strict";

  function normalizeVisType(_visType) {
    var visType = String(_visType || "").toLowerCase().trim();
    if (visType === "list") {
      return "table";
    }
    return visType;
  }

  function mapDimensionToAufrissValue(_dimension, _sicht) {
    var text = String(_dimension || "").toLowerCase();
    var matchers = _aufrissMaps.iconMatchers || [];
    var i;
    var n;
    var matcher;
    var needles;
    var mapped;
    for (i = 0; i < matchers.length; i += 1) {
      matcher = matchers[i];
      needles = matcher.needles || [];
      for (n = 0; n < needles.length; n += 1) {
        if (text.indexOf(String(needles[n]).toLowerCase()) !== -1) {
          mapped = typeof matcher.value === "function" ? matcher.value(_sicht) : matcher.value;
          return mapped == null ? "" : String(mapped);
        }
      }
    }
    return "";
  }

  function __controller(_spec, _warnings) {
    try {
      var spec = _spec && typeof _spec === "object" ? _spec : {};
      var visType = normalizeVisType(spec.visType);
      var dimText = String(spec.selectedDimension == null ? "" : spec.selectedDimension).trim();
      var dimLower = dimText.toLowerCase();
      var isPresent = dimText !== "" && dimLower !== "default" && dimLower !== "none";
      var mapped = isPresent ? mapDimensionToAufrissValue(dimText, spec.sicht) : "";
      var p1 = "";
      var p2 = "";
      if (isPresent && mapped === "" && Array.isArray(_warnings)) {
        _warnings.push({
          code: "DRILLTHROUGH_AUFRISS_UNMAPPED",
          message: "dimension did not map"
        });
      }
      if (visType === "line" || visType === "table") {
        p1 = "F_TST_SID";
        p2 = mapped;
      } else if (visType === "pie") {
        p1 = isPresent ? mapped : "GESCHLECHT";
      } else {
        p1 = mapped;
      }
      return {
        p_aufspannen_1: p1 || "",
        p_aufspannen_2: p2 || ""
      };
    } catch (err) {
      console.error("[drillthrough.assembleIconAufriss]", err);
      throw err;
    }
  }

  return __controller;
});

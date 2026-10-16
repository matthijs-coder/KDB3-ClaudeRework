define([
  "../config/aufrissMaps.js"
], function (_aufrissMaps) {
  "use strict";

  function categoryMatchText(_cat) {
    var cat = _cat && typeof _cat === "object" ? _cat : {};
    if (cat.columnId) {
      return String(cat.columnId);
    }
    if (cat.dataItemId) {
      return String(cat.dataItemId);
    }
    if (cat.name) {
      return String(cat.name);
    }
    return "";
  }

  function mapColumnToAufrissValue(_text, _sicht) {
    var haystack = String(_text || "").toLowerCase();
    var matchers = _aufrissMaps.datapointMatchers || [];
    var i;
    var n;
    var matcher;
    var needles;
    var mapped;
    for (i = 0; i < matchers.length; i += 1) {
      matcher = matchers[i];
      needles = matcher.needles || [];
      for (n = 0; n < needles.length; n += 1) {
        if (haystack.indexOf(String(needles[n]).toLowerCase()) !== -1) {
          mapped = typeof matcher.value === "function" ? matcher.value(_sicht) : matcher.value;
          return mapped == null ? "" : String(mapped);
        }
      }
    }
    return null;
  }

  function __controller(_spec, _warnings) {
    try {
      var spec = _spec && typeof _spec === "object" ? _spec : {};
      var categories = Array.isArray(spec.categories) ? spec.categories : [];
      var i;
      var mapped;
      var p1 = "";
      for (i = 0; i < categories.length; i += 1) {
        mapped = mapColumnToAufrissValue(categoryMatchText(categories[i]), spec.sicht);
        if (mapped != null) {
          p1 = mapped;
          break;
        }
      }
      return {
        p_aufspannen_1: p1 || "",
        p_aufspannen_2: ""
      };
    } catch (err) {
      console.error("[drillthrough.assembleDatapointAufriss]", err);
      throw err;
    }
  }

  return __controller;
});

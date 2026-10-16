define([], function () {
  "use strict";

  var EXPLICIT_TABLE_KEYS = {
    Berufsfamilie: "berufsfamilie_filter",
    Dienstverhältnis: "dienstverhältnis_filter",
    Geschlecht: "geschlecht_filter",
    Altersgruppe: "altersgruppe_filter",
    Personengruppe: "personengruppe_filter",
    Dienststellenleitung: "dienststellenleitung_filter"
  };

  function normalizeFilterLabelKey(_filterLabel) {
    return String(_filterLabel == null ? "" : _filterLabel)
      .trim()
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "");
  }

  function __controller(_filterLabel) {
    var label = String(_filterLabel == null ? "" : _filterLabel).trim();
    if (!label) {
      return "";
    }
    if (Object.prototype.hasOwnProperty.call(EXPLICIT_TABLE_KEYS, label)) {
      return EXPLICIT_TABLE_KEYS[label];
    }
    return normalizeFilterLabelKey(label) + "_filter";
  }

  return __controller;
});

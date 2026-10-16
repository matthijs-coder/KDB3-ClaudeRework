define([
  "./assembleDatapointAufriss.js",
  "./assembleDatapointTime.js",
  "../config/datenart.js"
], function (_assembleDatapointAufriss, _assembleDatapointTime, _datenart) {
  "use strict";

  function isMag(_sel) {
    return String((_sel && (_sel.idValue || _sel.displayValue)) || "").trim().toLowerCase() === "mag";
  }

  function isMagOnly(_orgSelection) {
    var selectedValues = _orgSelection && Array.isArray(_orgSelection.selectedValues) ? _orgSelection.selectedValues : [];
    var i;
    if (!selectedValues.length) {
      return false;
    }
    for (i = 0; i < selectedValues.length; i += 1) {
      if (!isMag(selectedValues[i])) {
        return false;
      }
    }
    return true;
  }

  function __controller(_spec, _warnings) {
    try {
      var spec = _spec && typeof _spec === "object" ? _spec : {};
      var code;
      var art;
      var aufriss;
      var time;
      if (!Array.isArray(spec.categories)) {
        return { errorCode: "DRILLTHROUGH_DATAPOINT_CATEGORIES" };
      }
      code = spec.kennzahlCode == null ? "" : String(spec.kennzahlCode);
      art = spec.sicht == null ? "" : String(spec.sicht);
      if (!code && Array.isArray(_warnings)) {
        _warnings.push({
          code: "DRILLTHROUGH_KENNZAHL_OMITTED",
          message: "kennzahlCode empty"
        });
      }
      if (!String(art).trim() && Array.isArray(_warnings)) {
        _warnings.push({
          code: "DRILLTHROUGH_SICHT_OMITTED",
          message: "sicht empty"
        });
      }
      aufriss = _assembleDatapointAufriss(spec, _warnings);
      if (isMagOnly(spec.orgSelection) && aufriss.p_aufspannen_1 === "DIENSTSTELLE_LANG_SID") {
        aufriss.p_aufspannen_1 = "";
      }
      time = _assembleDatapointTime(spec, _warnings);
      return {
        Kennzahl_Code: code,
        p_art: art,
        p_datenart: _datenart.HASH,
        p_gruppe_drillFromGDB: "",
        p_dienststelle_drillFromGDB: "",
        p_dezpv_drillFromGDB: "",
        p_range_DrillFromGDB: time.p_range_DrillFromGDB || "",
        p_aktmon_DrillFromGDB: time.p_aktmon_DrillFromGDB || "",
        p_aufspannen_1: aufriss.p_aufspannen_1 || "",
        source: "datapoint"
      };
    } catch (err) {
      console.error("[drillthrough.assembleDatapointDrillConfig]", err);
      throw err;
    }
  }

  return __controller;
});

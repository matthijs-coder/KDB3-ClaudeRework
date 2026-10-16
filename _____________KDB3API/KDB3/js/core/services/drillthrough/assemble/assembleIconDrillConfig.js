define([
  "./assembleIconAufriss.js",
  "./assembleIconTime.js",
  "../config/datenart.js"
], function (_assembleIconAufriss, _assembleIconTime, _datenart) {
  "use strict";

  function __controller(_spec, _warnings) {
    try {
      var spec = _spec && typeof _spec === "object" ? _spec : {};
      var code = spec.kennzahlCode == null ? "" : String(spec.kennzahlCode);
      var art = spec.sicht == null ? "" : String(spec.sicht);
      var aufriss;
      var time;
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
      aufriss = _assembleIconAufriss(spec, _warnings);
      time = _assembleIconTime(spec, _warnings);
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
        p_aufspannen_2: aufriss.p_aufspannen_2 || "",
        source: "icon"
      };
    } catch (err) {
      console.error("[drillthrough.assembleIconDrillConfig]", err);
      throw err;
    }
  }

  return __controller;
});

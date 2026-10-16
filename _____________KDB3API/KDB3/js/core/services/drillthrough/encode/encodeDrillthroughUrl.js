define([
  "../config/promptCatalog.js",
  "../config/datenart.js",
  "./resolveHostEnv.js"
], function (_promptCatalog, _datenart, _resolveHostEnv) {
  "use strict";

  function encodeOrg(_raw) {
    var source = String(_raw == null ? "" : _raw).replace(/~/g, " ");
    return encodeURIComponent(source).replace(/#/g, "%23");
  }

  function omitEmpty(_value) {
    return _value == null || _value === "" ? "" : String(_value);
  }

  function pair(_name, _value) {
    if (_value == null || _value === "") {
      return "";
    }
    return "&" + _name + "=" + _value;
  }

  function isOrgParam(_name) {
    return _name === "p_p_gruppe_DrillFromGDB" || _name === "p_p_dienststelle_DrillFromGDB" || _name === "p_p_dezpv_DrillFromGDB";
  }

  function collectValues(_drillConfig, _spec) {
    var cfg = _drillConfig && typeof _drillConfig === "object" ? _drillConfig : {};
    var constants = _promptCatalog.constants;
    var sicht = String(cfg.p_art || (_spec && _spec.sicht) || "").toUpperCase().trim();
    var source = cfg.source || (_spec && _spec.source) || "";
    var range = omitEmpty(cfg.p_range_DrillFromGDB);
    var kz = omitEmpty(cfg.Kennzahl_Code);
    var auf1 = omitEmpty(cfg.p_aufspannen_1);
    var gruppe = omitEmpty(cfg.p_gruppe_drillFromGDB);
    var values = {};
    values.p_p_art = omitEmpty(cfg.p_art);
    values.p_p_datenart = _datenart.HASH;
    values.p_p_gruppe_DrillFromGDB = gruppe;
    values.p_p_dienststelle_DrillFromGDB = "";
    values.p_p_dezpv_DrillFromGDB = "";
    if (sicht !== "DEZPV" && !(sicht === "BW" && gruppe)) {
      values.p_p_dienststelle_DrillFromGDB = omitEmpty(cfg.p_dienststelle_drillFromGDB);
    }
    if (sicht !== "BW") {
      values.p_p_dezpv_DrillFromGDB = omitEmpty(cfg.p_dezpv_drillFromGDB);
    }
    values.p_p_range_DrillFromGDB = range;
    values.p_p_stichtag_or_range = range ? constants.stichtagOrRange : "";
    values.p_p_dummy_validate = range ? constants.dummyValidate : "";
    values.p_p_art_DrillFromGDB = omitEmpty(cfg.p_art);
    values.p_p_kz_1 = kz;
    values.p_p_kz_1_source = kz ? constants.kzSource : "";
    values.p_p_noBlock_alleKZ = constants.noBlockAlleKz;
    values.p_p_KzBezeichnung_DrillFromGDB = kz;
    values.p_p_drillthroughFromGDB = constants.drillthroughFromGdb;
    values.p_p_drillthroughMultipleDstPossible = constants.drillthroughMultipleDstPossible;
    values.p_p_aktmon_DrillFromGDB = omitEmpty(cfg.p_aktmon_DrillFromGDB);
    values.p_p_aufspannen_1 = auf1;
    values.p_p_dummy_aufrissPrompt_v2 = auf1 ? constants.dummyAufriss : "";
    values.p_p_aufspannen_2 = source === "datapoint" ? "" : omitEmpty(cfg.p_aufspannen_2);
    return values;
  }

  function __controller(_drillConfig, _links, _spec) {
    try {
      var hostEnv = _resolveHostEnv(_spec);
      var base;
      var values;
      var parts;
      var order;
      var i;
      var name;
      var raw;
      var encoded;
      if (!hostEnv) {
        return { errorCode: "DRILLTHROUGH_HOST_UNRESOLVED" };
      }
      base = _links && _links.pkzAnalysetool ? _links.pkzAnalysetool[hostEnv] : "";
      if (!base) {
        return { errorCode: "DRILLTHROUGH_LINK_MISSING" };
      }
      values = collectValues(_drillConfig, _spec);
      parts = "";
      order = _promptCatalog.emitOrder;
      for (i = 0; i < order.length; i += 1) {
        name = order[i];
        raw = values[name];
        encoded = isOrgParam(name) ? encodeOrg(raw) : encodeURIComponent(String(raw == null ? "" : raw));
        parts += pair(name, raw == null || raw === "" ? "" : encoded);
      }
      return { url: String(base) + parts + _promptCatalog.constants.tail, hostEnv: hostEnv };
    } catch (err) {
      console.error("[drillthrough.encodeDrillthroughUrl]", err);
      throw err;
    }
  }

  return __controller;
});

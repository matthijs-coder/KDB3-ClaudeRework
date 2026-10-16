define([
  "./assemble.js",
  "./org/mapOrgPrompts.js",
  "./encode/encodeDrillthroughUrl.js",
  "./diagnostics/createBuildResult.js"
], function (
  _assemble,
  _mapOrgPrompts,
  _encodeDrillthroughUrl,
  _createBuildResult
) {
  "use strict";

  var MESSAGES = {
    DRILLTHROUGH_MISSING_SPEC: "spec missing or not an object",
    DRILLTHROUGH_INVALID_SOURCE: "source must be icon or datapoint",
    DRILLTHROUGH_DATAPOINT_CATEGORIES: "categories missing or not an array",
    DRILLTHROUGH_ORG_TREE_MISSING: "org tree missing",
    DRILLTHROUGH_ORG_TREE_INVALID: "org tree invalid",
    DRILLTHROUGH_LINK_MISSING: "pkzAnalysetool link missing",
    DRILLTHROUGH_HOST_UNRESOLVED: "host environment unresolved",
    DRILLTHROUGH_BUILD_INTERNAL: "unexpected build error"
  };

  function isObject(_v) {
    return !!(_v && typeof _v === "object" && !Array.isArray(_v));
  }

  function validateSpec(_spec) {
    if (!isObject(_spec)) {
      return { errorCode: "DRILLTHROUGH_MISSING_SPEC" };
    }
    if (_spec.source !== "icon" && _spec.source !== "datapoint") {
      return { errorCode: "DRILLTHROUGH_INVALID_SOURCE" };
    }
    return null;
  }

  function mergeOrg(_assembled, _org) {
    return {
      Kennzahl_Code: _assembled.Kennzahl_Code || "",
      p_art: _assembled.p_art || "",
      p_datenart: _assembled.p_datenart || "",
      p_gruppe_drillFromGDB: _org.p_gruppe_drillFromGDB || "",
      p_dienststelle_drillFromGDB: _org.p_dienststelle_drillFromGDB || "",
      p_dezpv_drillFromGDB: _org.p_dezpv_drillFromGDB || "",
      p_range_DrillFromGDB: _assembled.p_range_DrillFromGDB || "",
      p_aktmon_DrillFromGDB: _assembled.p_aktmon_DrillFromGDB || "",
      p_aufspannen_1: _assembled.p_aufspannen_1 || "",
      p_aufspannen_2: _assembled.p_aufspannen_2 || "",
      source: _assembled.source
    };
  }

  function failResult(_spec, _code, _stage, _warnings, _extra) {
    var extra = _extra || {};
    return _createBuildResult({
      ok: false,
      errorCode: _code,
      errorMessage: MESSAGES[_code] || _code,
      url: extra.url || null,
      source: _spec && _spec.source ? _spec.source : null,
      widgetId: _spec && _spec.widgetId != null ? _spec.widgetId : null,
      drillConfig: extra.drillConfig || null,
      diagnostics: {
        operation: "buildDrillthroughUrl",
        hostEnv: extra.hostEnv || null,
        failedStage: _stage,
        warnings: _warnings || []
      }
    });
  }

  function __controller(_spec, _deps) {
    try {
      var invalid = validateSpec(_spec);
      var warnings;
      var assembled;
      var org;
      var drillConfig;
      var encoded;
      if (invalid) {
        return failResult(_spec, invalid.errorCode, "validateSpec", []);
      }
      warnings = [];
      assembled = _spec.source === "icon" ? _assemble.assembleIconDrillConfig(_spec, warnings) : _assemble.assembleDatapointDrillConfig(_spec, warnings);
      if (assembled && assembled.errorCode === "DRILLTHROUGH_DATAPOINT_CATEGORIES") {
        return failResult(_spec, assembled.errorCode, "assemble", warnings);
      }
      org = _mapOrgPrompts(_spec, _deps, warnings);
      if (org && org.errorCode) {
        return failResult(_spec, org.errorCode, "mapOrg", warnings);
      }
      drillConfig = mergeOrg(assembled, org);
      encoded = _encodeDrillthroughUrl(drillConfig, _deps && _deps.links, _spec);
      if (encoded && encoded.errorCode) {
        return failResult(_spec, encoded.errorCode, "encodeUrl", warnings, { drillConfig: drillConfig });
      }
      return _createBuildResult({
        ok: true,
        url: encoded.url,
        source: _spec.source,
        widgetId: _spec.widgetId != null ? _spec.widgetId : null,
        drillConfig: drillConfig,
        diagnostics: {
          operation: "buildDrillthroughUrl",
          hostEnv: encoded.hostEnv,
          failedStage: null,
          warnings: warnings
        }
      });
    } catch (err) {
      console.error("[drillthrough.buildDrillthroughUrl]", err);
      return failResult(_spec, "DRILLTHROUGH_BUILD_INTERNAL", null, []);
    }
  }

  return __controller;
});

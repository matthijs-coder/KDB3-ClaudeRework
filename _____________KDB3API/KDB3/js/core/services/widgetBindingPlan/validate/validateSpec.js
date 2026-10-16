define([
  "../config.js",
], function (_config) {
  "use strict";

  function __controller(_spec) {
    if (!_spec || typeof _spec !== "object") {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_SPEC", message: "Binding plan spec is required." };
    }
    if (!_config.PLAN_TARGET_KINDS[_spec.targetKind]) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_INVALID_TARGET", message: "targetKind is missing or unsupported." };
    }
    var dataConfig = _spec.dataConfig;
    var config = _spec.config;
    if (!dataConfig || typeof dataConfig !== "object") {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_SPEC", message: "dataConfig is required." };
    }
    if (!dataConfig.datasourceId) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_DATASOURCE", message: "dataConfig.datasourceId is required." };
    }
    if (!dataConfig.visualizationType || !dataConfig.visTypeConfig) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_VISUALIZATION", message: "visualizationType and visTypeConfig are required." };
    }
    if (!config || !config.filterPropObj || !config.parameterMappingObj || !config.topNOptions) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_SPEC", message: "config snapshots are required." };
    }
    return { ok: true, dataConfig: dataConfig };
  }

  return __controller;
});

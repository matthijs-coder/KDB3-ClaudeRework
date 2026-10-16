define([
  "./resolveBindingApplyOptions.js",
], function (_resolveBindingApplyOptions) {
  "use strict";

  function __controller(_deps, _plan, _options) {
    if (!_deps || !_deps._KDB) {
      return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_INPUT", errorMessage: "Missing _KDB." };
    }
    if (!_plan) {
      return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_INPUT", errorMessage: "Missing plan." };
    }
    if (_plan.ok !== true || _plan.status !== "success") {
      return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_PLAN", errorMessage: "Plan is not successful." };
    }
    if (!_options || !_options.target || !_options.target.widgetId) {
      return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_INPUT", errorMessage: "Missing target.widgetId." };
    }
    if (!_options.signal) {
      return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_INPUT", errorMessage: "Missing AbortSignal." };
    }
    if (!_deps.cognosBinding || typeof _deps.cognosBinding.isComplete !== "function" || !_deps.cognosBinding.isComplete()) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
        errorMessage: "Required Cognos binding surface is unavailable.",
      };
    }
    if (!_plan.datasource || !_plan.datasource.id) {
      return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_PLAN", errorMessage: "Plan missing datasource.id." };
    }
    if (!_plan.visualization) {
      return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_PLAN", errorMessage: "Plan missing visualization." };
    }
    if (!_resolveBindingApplyOptions.resolveDesiredVisType(_plan)) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_INVALID_PLAN",
        errorMessage: "Plan missing desired visType.",
      };
    }
    return { ok: true };
  }

  return __controller;
});

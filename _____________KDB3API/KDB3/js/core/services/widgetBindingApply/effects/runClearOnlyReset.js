define([
  "../diagnostics/createApplyResult.js",
  "./applyBindingStepBundle.js",
], function (_createApplyResult, _applyBindingStepBundle) {
  "use strict";

  var SKIPPED_AFTER_CLEAR = [
    "readCurrentVisType",
    "setDatasourceInitial",
    "setVisType",
    "setDatasourceAfterClear",
    "applySlots",
    "removeManagedFilters",
    "applyLocalFilters",
    "applyTopBottom",
    "renderWidget",
    "waitRenderComplete"
  ];

  async function __controller(_plan, _options, _diagnosticsBuilder, _signal, _cognosBinding) {
    var clearOutcome;
    var index;
    try {
      clearOutcome = await _applyBindingStepBundle.runClearSlotsAndFiltersStep(
        _plan, _options, _diagnosticsBuilder, _signal, _cognosBinding
      );
      if (clearOutcome.aborted) {
        return clearOutcome.result;
      }
      if (!clearOutcome.ok) {
        return _createApplyResult("error", _plan, _diagnosticsBuilder.finishDiagnostics());
      }
      for (index = 0; index < SKIPPED_AFTER_CLEAR.length; index += 1) {
        _diagnosticsBuilder.addSkippedStep(SKIPPED_AFTER_CLEAR[index]);
      }
      return _createApplyResult("success", _plan, _diagnosticsBuilder.finishDiagnostics());
    } catch (err) {
      console.error("[widgetBindingApply.runClearOnlyReset] failed", {
        widgetId: _options && _options.target ? _options.target.widgetId : null
      }, err);
      _diagnosticsBuilder.setFailedStep(
        "clearSlotsAndFilters",
        "WIDGET_BINDING_APPLY_CLEAR_FAILED",
        String(err && err.message ? err.message : err)
      );
      return _createApplyResult("error", _plan, _diagnosticsBuilder.finishDiagnostics());
    }
  }

  return __controller;
});

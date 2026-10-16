define([
  "./buildAbortedApplyResult.js",
  "./bindingApplyStepHelpers.js",
], function (_buildAbortedApplyResult, _bindingApplyStepHelpers) {
  "use strict";

  async function __controller(_plan, _options, _diagnosticsBuilder, _signal, _cognosBinding) {
    var widgetId = _options.target.widgetId;
    var mapped;

    try {
      mapped = _bindingApplyStepHelpers.mapFacetOutcome(
        await Promise.resolve(_cognosBinding.clearAllSlots(widgetId, { signal: _signal }))
      );
      if (mapped.aborted) {
        return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
      }
      if (!mapped.ok) {
        _diagnosticsBuilder.setFailedStep(
          "clearSlotsAndFilters",
          mapped.errorCode || "WIDGET_BINDING_APPLY_CLEAR_FAILED",
          mapped.errorMessage || "clearAllSlots failed."
        );
        return { ok: false };
      }

      if (_signal && _signal.aborted) {
        return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
      }

      mapped = _bindingApplyStepHelpers.mapFacetOutcome(
        await Promise.resolve(_cognosBinding.clearAllLocalFilters(widgetId, { signal: _signal }))
      );
      if (mapped.aborted) {
        return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
      }
      if (!mapped.ok) {
        _diagnosticsBuilder.setFailedStep(
          "clearSlotsAndFilters",
          mapped.errorCode || "WIDGET_BINDING_APPLY_CLEAR_FAILED",
          mapped.errorMessage || "clearAllLocalFilters failed."
        );
        return { ok: false };
      }
      _diagnosticsBuilder.addCompletedStep("clearSlotsAndFilters");
      return { ok: true };
    } catch (err) {
      _diagnosticsBuilder.setFailedStep(
        "clearSlotsAndFilters",
        "WIDGET_BINDING_APPLY_CLEAR_FAILED",
        String(err && err.message ? err.message : err)
      );
      return { ok: false };
    }
  }

  return __controller;
});

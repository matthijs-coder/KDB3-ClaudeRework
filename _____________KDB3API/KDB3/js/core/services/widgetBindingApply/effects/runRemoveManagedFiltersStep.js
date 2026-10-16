define([
  "./buildAbortedApplyResult.js",
  "./bindingApplyStepHelpers.js",
], function (_buildAbortedApplyResult, _bindingApplyStepHelpers) {
  "use strict";

  async function __controller(_plan, _options, _diagnosticsBuilder, _signal, _cognosBinding) {
    var widgetId = _options.target.widgetId;
    var previousIds = Array.isArray(_options.previousManagedFilterItemIds) ? _options.previousManagedFilterItemIds : [];
    var index;
    var mapped;

    try {
      if (!previousIds.length) {
        _diagnosticsBuilder.addSkippedStep("removeManagedFilters");
        return { ok: true };
      }

      for (index = 0; index < previousIds.length; index += 1) {
        if (_signal && _signal.aborted) {
          return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
        }
        mapped = _bindingApplyStepHelpers.mapFacetOutcome(
          await Promise.resolve(
            _cognosBinding.removeLocalFilter(widgetId, { itemId: String(previousIds[index]) }, { signal: _signal })
          )
        );
        if (mapped.aborted) {
          return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
        }
        if (!mapped.ok) {
          _diagnosticsBuilder.setFailedStep(
            "removeManagedFilters",
            mapped.errorCode || "WIDGET_BINDING_APPLY_REMOVE_FILTER_FAILED",
            mapped.errorMessage || "removeLocalFilter failed."
          );
          return { ok: false };
        }
      }
      _diagnosticsBuilder.addCompletedStep("removeManagedFilters");
      return { ok: true };
    } catch (err) {
      _diagnosticsBuilder.setFailedStep(
        "removeManagedFilters",
        "WIDGET_BINDING_APPLY_REMOVE_FILTER_FAILED",
        String(err && err.message ? err.message : err)
      );
      return { ok: false };
    }
  }

  return __controller;
});

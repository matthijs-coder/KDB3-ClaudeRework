define([
  "../diagnostics/createApplyResult.js",
  "./resolveBindingApplyOptions.js",
  "./buildAbortedApplyResult.js",
  "./bindingApplyStepHelpers.js",
  "./applyBindingStepBundle.js",
  "./runApplySlotsFiltersPhase.js",
], function (
  _createApplyResult,
  _resolveBindingApplyOptions,
  _buildAbortedApplyResult,
  _bindingApplyStepHelpers,
  _applyBindingStepBundle,
  _runApplySlotsFiltersPhase
) {
  "use strict";

  async function __controller(_deps, _plan, _options, _diagnosticsBuilder, _signal, _cognosBinding) {
    var target = _options.target || {};
    var widgetId = target.widgetId;
    var clearNeeded;
    var clearOutcome;
    var phaseOutcome;
    var abortedOutcome;
    var mapped;

    try {
      clearNeeded = _resolveBindingApplyOptions.shouldClearSlots(_plan);
      if (clearNeeded) {
        clearOutcome = await _applyBindingStepBundle.runClearSlotsAndFiltersStep(_plan, _options, _diagnosticsBuilder, _signal, _cognosBinding);
        if (clearOutcome.aborted) {
          return { aborted: true, result: clearOutcome.result };
        }
        if (!clearOutcome.ok) {
          return { ok: false, result: _createApplyResult("error", _plan, _diagnosticsBuilder.finishDiagnostics()) };
        }

        abortedOutcome = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
        if (abortedOutcome) {
          return abortedOutcome;
        }

        mapped = _bindingApplyStepHelpers.mapFacetOutcome(
          await Promise.resolve(_cognosBinding.setVizDataSource(_plan.datasource.id, widgetId, { signal: _signal }))
        );
        if (mapped.aborted) {
          return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
        }
        if (!mapped.ok) {
          _bindingApplyStepHelpers.setStepFailure(
            _diagnosticsBuilder,
            "setDatasourceAfterClear",
            mapped.errorCode || "WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED",
            mapped.errorMessage || "setVizDataSource failed."
          );
          return { ok: false, result: _createApplyResult("error", _plan, _diagnosticsBuilder.finishDiagnostics()) };
        }
        _diagnosticsBuilder.addCompletedStep("setDatasourceAfterClear");
      } else {
        _diagnosticsBuilder.addSkippedStep("clearSlotsAndFilters");
        _diagnosticsBuilder.addSkippedStep("setDatasourceAfterClear");
      }

      abortedOutcome = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
      if (abortedOutcome) {
        return abortedOutcome;
      }

      phaseOutcome = await _runApplySlotsFiltersPhase(_plan, _options, _diagnosticsBuilder, _signal, _cognosBinding);
      if (phaseOutcome.aborted) {
        return { aborted: true, result: phaseOutcome.result };
      }
      if (!phaseOutcome.ok) {
        return phaseOutcome;
      }

      return { ok: true };
    } catch (err) {
      console.error("[widgetBindingApply.runApplyBindingMiddleSteps] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  return __controller;
});

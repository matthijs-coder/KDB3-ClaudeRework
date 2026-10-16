define([
  "../diagnostics/createApplyResult.js",
  "./applySlots.js",
  "./applyLocalFilters.js",
  "./applyTopBottom.js",
  "./resolveBindingApplyOptions.js",
  "./bindingApplyStepHelpers.js",
  "./runRemoveManagedFiltersStep.js",
], function (
  _createApplyResult,
  _applySlots,
  _applyLocalFilters,
  _applyTopBottom,
  _resolveBindingApplyOptions,
  _bindingApplyStepHelpers,
  _runRemoveManagedFiltersStep
) {
  "use strict";

  function returnStepError(_plan, _diagnosticsBuilder, _stepId, _outcome) {
    _diagnosticsBuilder.setFailedStep(_stepId, _outcome.errorCode, _outcome.errorMessage);
    return { ok: false, result: _createApplyResult("error", _plan, _diagnosticsBuilder.finishDiagnostics()) };
  }

  async function runEffectSubStep(_signal, _plan, _diagnosticsBuilder, _stepId, _run) {
    var outcome = await _run();
    var abortedOutcome = _bindingApplyStepHelpers.returnAbortedIfSignalledOrOutcome(_signal, _plan, _diagnosticsBuilder, outcome);
    if (abortedOutcome) {
      return abortedOutcome;
    }
    if (!outcome.ok) {
      return returnStepError(_plan, _diagnosticsBuilder, _stepId, outcome);
    }
    return null;
  }

  async function __controller(_plan, _options, _diagnosticsBuilder, _signal, _cognosBinding) {
    var target = _options.target || {};
    var widgetId = target.widgetId;
    var applySlotsNeeded;
    var stepError;
    var managedOutcome;
    var topBottomOutcome;

    try {
      applySlotsNeeded = _resolveBindingApplyOptions.shouldClearSlots(_plan);
      if (applySlotsNeeded) {
        stepError = await runEffectSubStep(_signal, _plan, _diagnosticsBuilder, "applySlots", function () {
          return _applySlots(target, _plan.slots, _diagnosticsBuilder, _signal, _cognosBinding);
        });
        if (stepError) {
          return stepError;
        }
        _diagnosticsBuilder.addCompletedStep("applySlots");
      } else {
        _diagnosticsBuilder.addSkippedStep("applySlots");
        _diagnosticsBuilder.addWarning(
          "WIDGET_BINDING_APPLY_SLOTS_UNCHANGED",
          "Skipped applySlots because slotsChanged is false and no slot clear/reset is requested.",
          "applySlots"
        );
        if (_diagnosticsBuilder.diagnostics && _diagnosticsBuilder.diagnostics.cognos) {
          _diagnosticsBuilder.diagnostics.cognos.appliedSlotCount = 0;
        }
      }

      stepError = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
      if (stepError) {
        return stepError;
      }

      if (_plan.targetKind === "topNHelper") {
        _diagnosticsBuilder.addSkippedStep("removeManagedFilters");
      } else {
        managedOutcome = await _runRemoveManagedFiltersStep(_plan, _options, _diagnosticsBuilder, _signal, _cognosBinding);
        if (managedOutcome.aborted) {
          return { aborted: true, result: managedOutcome.result };
        }
        if (!managedOutcome.ok) {
          return { ok: false, result: _createApplyResult("error", _plan, _diagnosticsBuilder.finishDiagnostics()) };
        }
      }

      stepError = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
      if (stepError) {
        return stepError;
      }

      stepError = await runEffectSubStep(_signal, _plan, _diagnosticsBuilder, "applyLocalFilters", function () {
        return _applyLocalFilters(target, _plan.localFilters, _diagnosticsBuilder, _signal, _cognosBinding);
      });
      if (stepError) {
        return stepError;
      }
      _diagnosticsBuilder.addCompletedStep("applyLocalFilters");

      stepError = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
      if (stepError) {
        return stepError;
      }

      topBottomOutcome = await _applyTopBottom(target, _plan, _diagnosticsBuilder, _signal, _cognosBinding);
      stepError = _bindingApplyStepHelpers.returnAbortedIfSignalledOrOutcome(_signal, _plan, _diagnosticsBuilder, topBottomOutcome);
      if (stepError) {
        return stepError;
      }
      if (!topBottomOutcome.ok) {
        return returnStepError(_plan, _diagnosticsBuilder, "applyTopBottom", topBottomOutcome);
      }
      if (topBottomOutcome.skipped) {
        _diagnosticsBuilder.addSkippedStep("applyTopBottom");
      } else {
        _diagnosticsBuilder.addCompletedStep("applyTopBottom");
      }

      return { ok: true };
    } catch (err) {
      console.error("[widgetBindingApply.runApplySlotsFiltersPhase] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  return __controller;
});

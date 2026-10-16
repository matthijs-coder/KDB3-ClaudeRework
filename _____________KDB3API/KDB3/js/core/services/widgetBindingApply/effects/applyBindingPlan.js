define([
  "../diagnostics/createDiagnostics.js",
  "../diagnostics/createApplyResult.js",
  "./buildAbortedApplyResult.js",
  "./applyBindingStepBundle.js",
  "./runApplyBindingMiddleSteps.js",
  "./runClearOnlyReset.js",
  "./bindingApplyStepHelpers.js",
  "../runtime/manageBindingApplyTimers.js",
], function (
  _createDiagnostics,
  _createApplyResult,
  _buildAbortedApplyResult,
  _applyBindingStepBundle,
  _runApplyBindingMiddleSteps,
  _runClearOnlyReset,
  _bindingApplyStepHelpers,
  _manageBindingApplyTimers
) {
  "use strict";

  function isClearOnlyReset(_plan) {
    return !!(_plan && _plan.resetIntent && _plan.resetIntent.rebuildAfterClear === false);
  }

  async function __controller(_deps, _plan, _options) {
    var options = _options || {};
    var signal = options.signal;
    var target = options.target || {};
    var cognosBinding = _deps.cognosBinding;
    var diagnosticsBuilder = _createDiagnostics(target, "applyBinding", _plan && _plan.reason);
    var widgetId = target.widgetId;
    var timerScopeId = _manageBindingApplyTimers.buildApplyBindingTimerScopeId(target);
    var validation;
    var preOutcome;
    var middleOutcome;
    var renderOutcome;
    var abortedResult;
    var result;

    try {
      options.timerScopeId = timerScopeId;

      abortedResult = _bindingApplyStepHelpers.returnAbortedResultIfSignalled(signal, _plan, diagnosticsBuilder);
      if (abortedResult) {
        return abortedResult;
      }

      validation = _applyBindingStepBundle.validateBindingApplyInputs(_deps, _plan, options);
      if (!validation.ok) {
        diagnosticsBuilder.setFailedStep("validateInputs", validation.errorCode, validation.errorMessage);
        return _createApplyResult("error", _plan, diagnosticsBuilder.finishDiagnostics());
      }
      diagnosticsBuilder.addCompletedStep("validateInputs");

      if (isClearOnlyReset(_plan)) {
        return await _runClearOnlyReset(_plan, options, diagnosticsBuilder, signal, cognosBinding);
      }

      abortedResult = _bindingApplyStepHelpers.returnAbortedResultIfSignalled(signal, _plan, diagnosticsBuilder);
      if (abortedResult) {
        return abortedResult;
      }

      preOutcome = await _applyBindingStepBundle.runApplyBindingPreSteps(_deps, _plan, options, diagnosticsBuilder, signal, cognosBinding);
      if (preOutcome.aborted) {
        return preOutcome.result;
      }
      if (!preOutcome.ok) {
        return _createApplyResult("error", _plan, diagnosticsBuilder.finishDiagnostics());
      }

      abortedResult = _bindingApplyStepHelpers.returnAbortedResultIfSignalled(signal, _plan, diagnosticsBuilder);
      if (abortedResult) {
        return abortedResult;
      }

      middleOutcome = await _runApplyBindingMiddleSteps(_deps, _plan, options, diagnosticsBuilder, signal, cognosBinding);
      if (middleOutcome.aborted) {
        return middleOutcome.result;
      }
      if (!middleOutcome.ok) {
        return middleOutcome.result;
      }

      abortedResult = _bindingApplyStepHelpers.returnAbortedResultIfSignalled(signal, _plan, diagnosticsBuilder);
      if (abortedResult) {
        return abortedResult;
      }

      renderOutcome = await _applyBindingStepBundle.runApplyBindingRenderSteps(_deps, _plan, options, diagnosticsBuilder, signal, cognosBinding);
      if (renderOutcome.aborted) {
        return renderOutcome.result;
      }
      if (renderOutcome.timedOut) {
        return _createApplyResult("timeout", _plan, diagnosticsBuilder.finishDiagnostics({ timedOut: true }));
      }
      if (!renderOutcome.ok) {
        return _createApplyResult("error", _plan, diagnosticsBuilder.finishDiagnostics());
      }
      return renderOutcome.result;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return _buildAbortedApplyResult(_plan, diagnosticsBuilder);
      }
      console.error("[widgetBindingApply.applyBindingPlan] failed", { widgetId: widgetId }, err);
      diagnosticsBuilder.setFailedStep("buildSuccessResult", "WIDGET_BINDING_APPLY_UNEXPECTED_ERROR", String(err && err.message ? err.message : err));
      result = _createApplyResult("error", _plan, diagnosticsBuilder.finishDiagnostics());
      return result;
    } finally {
      _manageBindingApplyTimers.clearBindingApplyTimerScope(_deps._KDB, timerScopeId);
    }
  }

  return __controller;
});

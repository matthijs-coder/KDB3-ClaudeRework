define([
  "../diagnostics/createApplyResult.js",
  "./waitForRender.js",
  "./resolveBindingApplyOptions.js",
  "./bindingApplyStepHelpers.js",
], function (_createApplyResult, _waitForRender, _resolveBindingApplyOptions, _bindingApplyStepHelpers) {
  "use strict";

  function setRenderWaitMs(_diagnosticsBuilder, _renderWaitMs) {
    _diagnosticsBuilder.diagnostics.renderWaitMs = _renderWaitMs;
  }

  function failRenderWaitStep(_diagnosticsBuilder, _errorCode, _errorMessage, _renderWaitMs) {
    _diagnosticsBuilder.setFailedStep("waitRenderComplete", _errorCode, _errorMessage);
    setRenderWaitMs(_diagnosticsBuilder, _renderWaitMs);
  }

  async function __controller(_deps, _plan, _options, _diagnosticsBuilder, _signal, _cognosBinding) {
    var target = _options.target || {};
    var defaults = _deps && _deps.defaults ? _deps.defaults : {};
    var widgetId = target.widgetId;
    var renderWaitOptions;
    var timeoutMs;
    var renderWaitStartedAt;
    var armOutcome;
    var armed;
    var waitOutcome;
    var emptyDiagnostics;
    var abortedOutcome;
    var mapped;

    try {
      abortedOutcome = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
      if (abortedOutcome) {
        return abortedOutcome;
      }

      renderWaitOptions = _resolveBindingApplyOptions.resolveRenderWaitOptions(_options, defaults, target);
      timeoutMs = _resolveBindingApplyOptions.resolveTimeoutMs(_options, defaults, target);
      renderWaitStartedAt = Date.now();

      if (renderWaitOptions.waitForComplete !== false) {
        armOutcome = _waitForRender.armRenderWait(target, { renderWait: renderWaitOptions }, _cognosBinding, _signal);
        if (!armOutcome.ok) {
          failRenderWaitStep(_diagnosticsBuilder, armOutcome.errorCode, armOutcome.errorMessage, Date.now() - renderWaitStartedAt);
          return { ok: false };
        }
        armed = armOutcome.armed;
        _diagnosticsBuilder.addWarning(
          "WIDGET_BINDING_APPLY_RENDER_WAIT_ARMED",
          "start=" + (armed.startPromise ? "yes" : "no") + ", complete=" + (armed.completePromise ? "yes" : "no"),
          "waitRenderComplete"
        );
      }

      abortedOutcome = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
      if (abortedOutcome) {
        return abortedOutcome;
      }

      try {
        mapped = _bindingApplyStepHelpers.mapFacetOutcome(
          await Promise.resolve(_cognosBinding.renderWidget(widgetId, { signal: _signal }))
        );
        if (mapped.aborted) {
          return _bindingApplyStepHelpers.returnAbortedIfSignalledOrOutcome(_signal, _plan, _diagnosticsBuilder, mapped);
        }
        if (!mapped.ok) {
          _bindingApplyStepHelpers.setStepFailure(
            _diagnosticsBuilder,
            "renderWidget",
            mapped.errorCode || "WIDGET_BINDING_APPLY_RENDER_FAILED",
            mapped.errorMessage || "renderWidget failed."
          );
          return { ok: false };
        }
        _diagnosticsBuilder.addCompletedStep("renderWidget");
      } catch (err) {
        _bindingApplyStepHelpers.setStepFailure(
          _diagnosticsBuilder,
          "renderWidget",
          "WIDGET_BINDING_APPLY_RENDER_FAILED",
          err
        );
        return { ok: false };
      }

      abortedOutcome = _bindingApplyStepHelpers.returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder);
      if (abortedOutcome) {
        return abortedOutcome;
      }

      if (renderWaitOptions.waitForComplete === false) {
        // Deferred render wait: renderWidget was triggered, but the caller
        // owns render completion (e.g. writeback post-restore traverse).
        _diagnosticsBuilder.addSkippedStep("waitRenderComplete");
        setRenderWaitMs(_diagnosticsBuilder, 0);
        emptyDiagnostics = _resolveBindingApplyOptions.resolveEmptyDiagnostics(_plan);
        _diagnosticsBuilder.addCompletedStep("buildSuccessResult");
        return { ok: true, result: _createApplyResult("success", _plan, _diagnosticsBuilder.finishDiagnostics(emptyDiagnostics)) };
      }

      waitOutcome = await _waitForRender.finishRenderWait(
        _deps._KDB,
        target,
        {
          timeoutMs: timeoutMs,
          timerScopeId: _options.timerScopeId,
          renderWait: renderWaitOptions,
        },
        _signal,
        armed,
        renderWaitStartedAt
      );
      abortedOutcome = _bindingApplyStepHelpers.returnAbortedIfSignalledOrOutcome(_signal, _plan, _diagnosticsBuilder, waitOutcome);
      if (abortedOutcome) {
        return abortedOutcome;
      }
      if (waitOutcome.timedOut) {
        failRenderWaitStep(
          _diagnosticsBuilder,
          "WIDGET_BINDING_APPLY_RENDER_TIMEOUT",
          "Render wait timed out.",
          waitOutcome.renderWaitMs || 0
        );
        return { timedOut: true };
      }
      if (!waitOutcome.ok) {
        failRenderWaitStep(
          _diagnosticsBuilder,
          waitOutcome.errorCode || "WIDGET_BINDING_APPLY_RENDER_WAIT_FAILED",
          waitOutcome.errorMessage || "Render wait failed.",
          waitOutcome.renderWaitMs || 0
        );
        return { ok: false };
      }

      setRenderWaitMs(_diagnosticsBuilder, waitOutcome.renderWaitMs || 0);
      _diagnosticsBuilder.addCompletedStep("waitRenderComplete");
      emptyDiagnostics = _resolveBindingApplyOptions.resolveEmptyDiagnostics(_plan);
      _diagnosticsBuilder.addCompletedStep("buildSuccessResult");
      return { ok: true, result: _createApplyResult("success", _plan, _diagnosticsBuilder.finishDiagnostics(emptyDiagnostics)) };
    } catch (err) {
      console.error("[widgetBindingApply.runApplyBindingRenderSteps] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  return __controller;
});

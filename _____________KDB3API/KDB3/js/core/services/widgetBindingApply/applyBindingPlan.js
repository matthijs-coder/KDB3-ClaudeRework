define([
  "./config.js",
  "./diagnostics.js",
  "./applyOptions.js",
  "./steps/cognosSetup.js",
  "./steps/applySlots.js",
  "./steps/applyFilters.js",
  "./steps/applyTopBottom.js",
  "./renderWait.js",
  "../../utils/kit/runtime.js",
], function (_config, _diagnostics, _applyOptions, _cognosSetup, _applySlots, _applyFilters, _applyTopBottom, _renderWait, _rt) {
  "use strict";

  // Applies a widgetBindingPlan to one Cognos widget as a fixed list of steps. Every step is preceded by an
  // abort check. Per step:
  //   catchCode        a thrown error becomes a failure with this code (other throws end the apply as
  //                    UNEXPECTED_ERROR, or aborted for an AbortError)
  //   abortCheckAfter  an abort raised while the step ran wins over the step's own outcome
  //   recordStep       false: the step id is not added to completedSteps
  // The step ids and their order are part of the diagnostics contract (completedSteps / skippedSteps).

  var VALIDATE_STEP = { id: "validateInputs", run: validateInputs };

  var CLEAR_ONLY_STEPS = [
    { id: "clearSlotsAndFilters", run: _cognosSetup.clearSlotsAndFilters, catchCode: "WIDGET_BINDING_APPLY_CLEAR_FAILED" },
  ];

  var APPLY_STEPS = [
    { id: "readCurrentVisType", run: _cognosSetup.readCurrentVisType, catchCode: "WIDGET_BINDING_APPLY_GET_VIS_TYPE_FAILED" },
    { id: "setDatasourceInitial", run: _cognosSetup.setDatasourceInitial, catchCode: "WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED" },
    { id: "setVisType", run: _cognosSetup.setVisType },
    { id: "clearSlotsAndFilters", run: _cognosSetup.clearSlotsAndFiltersIfNeeded, catchCode: "WIDGET_BINDING_APPLY_CLEAR_FAILED" },
    { id: "setDatasourceAfterClear", run: _cognosSetup.setDatasourceAfterClear },
    { id: "applySlots", run: _applySlots, abortCheckAfter: true },
    { id: "removeManagedFilters", run: _applyFilters.removeManagedFilters, catchCode: "WIDGET_BINDING_APPLY_REMOVE_FILTER_FAILED" },
    { id: "applyLocalFilters", run: _applyFilters.applyLocalFilters, abortCheckAfter: true },
    { id: "applyTopBottom", run: _applyTopBottom, catchCode: "WIDGET_BINDING_APPLY_TOPBOTTOM_FAILED", abortCheckAfter: true },
    { id: "armRenderWait", run: _renderWait.armRenderWait, recordStep: false },
    { id: "renderWidget", run: _renderWait.renderWidget, catchCode: "WIDGET_BINDING_APPLY_RENDER_FAILED" },
    { id: "waitRenderComplete", run: _renderWait.waitRenderComplete, abortCheckAfter: true },
    { id: "buildSuccessResult", run: function () { return _diagnostics.COMPLETED; } },
  ];

  function validateInputs(_ctx) {
    var validation = _applyOptions.validateBindingApplyInputs(_ctx.rt, _ctx.plan, _ctx.options);
    return validation.ok ? _diagnostics.COMPLETED : _diagnostics.failed(validation.errorCode, validation.errorMessage);
  }

  function isAborted(_signal) {
    return !!(_signal && _signal.aborted);
  }

  function buildTimerScopeId(_target) {
    var widgetId = _target.widgetId != null ? String(_target.widgetId) : "unknown";
    var opSeq = _target.opSeq != null ? String(_target.opSeq) : "0";
    return "applyBinding:" + widgetId + ":" + opSeq;
  }

  async function runStep(_ctx, _step) {
    if (!_step.catchCode) {
      return _step.run(_ctx);
    }
    try {
      return await _step.run(_ctx);
    } catch (err) {
      return _diagnostics.failed(_step.catchCode, _diagnostics.formatErrorMessage(err));
    }
  }

  // Returns the apply result that ends the run, or null to continue with the next step.
  function recordOutcome(_ctx, _step, _outcome) {
    var builder = _ctx.diagnostics;
    if (_outcome.state === "aborted") {
      return _diagnostics.createAbortedResult(_ctx.plan, builder);
    }
    if (typeof _outcome.renderWaitMs === "number") {
      builder.diagnostics.renderWaitMs = _outcome.renderWaitMs;
    }
    if (_outcome.state === "skipped") {
      builder.addSkippedStep(_step.id);
      return null;
    }
    if (_outcome.state === "completed") {
      if (_step.recordStep !== false) {
        builder.addCompletedStep(_step.id);
      }
      return null;
    }
    builder.setFailedStep(_outcome.step || _step.id, _outcome.errorCode, _outcome.errorMessage);
    if (_outcome.state === "timeout") {
      return _diagnostics.createApplyResult("timeout", _ctx.plan, builder.finishDiagnostics({ timedOut: true }));
    }
    return _diagnostics.createApplyResult("error", _ctx.plan, builder.finishDiagnostics());
  }

  async function runSteps(_ctx, _steps) {
    for (var index = 0; index < _steps.length; index += 1) {
      var step = _steps[index];
      if (isAborted(_ctx.signal)) {
        return _diagnostics.createAbortedResult(_ctx.plan, _ctx.diagnostics);
      }
      var outcome = await runStep(_ctx, step);
      if (step.abortCheckAfter && isAborted(_ctx.signal)) {
        outcome = _diagnostics.ABORTED;
      }
      var result = recordOutcome(_ctx, step, outcome);
      if (result) {
        return result;
      }
    }
    return null;
  }

  async function runPlan(_ctx) {
    var result = await runSteps(_ctx, [VALIDATE_STEP]);
    if (result) {
      return result;
    }
    if (_applyOptions.isClearOnlyReset(_ctx.plan)) {
      result = await runSteps(_ctx, CLEAR_ONLY_STEPS);
      if (result) {
        return result;
      }
      _config.SKIPPED_AFTER_CLEAR.forEach(function (stepId) {
        _ctx.diagnostics.addSkippedStep(stepId);
      });
      return _diagnostics.createApplyResult("success", _ctx.plan, _ctx.diagnostics.finishDiagnostics());
    }
    result = await runSteps(_ctx, APPLY_STEPS);
    if (result) {
      return result;
    }
    return _diagnostics.createApplyResult(
      "success", _ctx.plan, _ctx.diagnostics.finishDiagnostics(_applyOptions.resolveEmptyDiagnostics(_ctx.plan))
    );
  }

  function clearTimerScope(_runtime, _scopeId) {
    var timers = _runtime.timers || {};
    var prefix = _scopeId + ":";
    Object.keys(timers).forEach(function (key) {
      if (key.indexOf(prefix) === 0) {
        _rt.clearTimer(timers, key);
      }
    });
  }

  async function applyBindingPlan(_KDB, _plan, _options) {
    var options = _options || {};
    var target = options.target || {};
    var rt = _KDB.runtime.widgetBindingApply;
    var ctx = {
      _KDB: _KDB,
      rt: rt,
      plan: _plan,
      options: options,
      target: target,
      widgetId: target.widgetId,
      signal: options.signal,
      diagnostics: _diagnostics.createDiagnostics(target, "applyBinding", _plan && _plan.reason),
      timerScopeId: buildTimerScopeId(target),
      visualization: rt.visualizationFacet,
      widgets: rt.widgetsFacet,
      canvas: rt.canvasFacet,
    };

    try {
      options.timerScopeId = ctx.timerScopeId;
      return await runPlan(ctx);
    } catch (err) {
      if (err && err.name === "AbortError") {
        return _diagnostics.createAbortedResult(_plan, ctx.diagnostics);
      }
      console.error("[widgetBindingApply.applyBindingPlan] failed", { widgetId: ctx.widgetId }, err);
      ctx.diagnostics.setFailedStep("buildSuccessResult", "WIDGET_BINDING_APPLY_UNEXPECTED_ERROR", _diagnostics.formatErrorMessage(err));
      return _diagnostics.createApplyResult("error", _plan, ctx.diagnostics.finishDiagnostics());
    } finally {
      clearTimerScope(rt, ctx.timerScopeId);
    }
  }

  return applyBindingPlan;
});

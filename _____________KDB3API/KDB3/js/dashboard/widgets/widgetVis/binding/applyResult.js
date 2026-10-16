define([
  "../legend/sweep.js",
  "../render/postRender.js",
  "../render/visProperties.js",
  "../results.js",
  "../state.js",
  "../visTypes.js"
], function (_legendSweep, _postRender, _visProperties, _results, _state, _visTypes) {
  "use strict";

  function isCleanupInput(_input) {
    return !!_input && _input.mode === "cleanup";
  }

  function abortedStaleResult(_widgetId, _opSeq) {
    return { ok: false, widgetId: _widgetId, opSeq: _opSeq, stale: true, status: "aborted" };
  }

  function isAbortedApply(_context, _ctx) {
    return _context.isStaleOpSeq(_ctx.widgetId, _ctx.opSeq) || _ctx.abortController.signal.aborted;
  }

  function buildDerivedPatch(_plan, _applyResult, _input) {
    var metric = _state.normalizeMetricIdentity((_input && _input.metric) || {});
    var settings = (_input && _input.settings) || {};
    var mirrorPatch = (_applyResult && _applyResult.mirrorPatch) || (_plan && _plan.mirrorPatch) || {};
    var derived = {
      datasourceId: mirrorPatch.datasourceId || (_plan && _plan.datasource ? _plan.datasource.id : null),
      datasourceName: mirrorPatch.datasourceName != null ? mirrorPatch.datasourceName : metric.metricsTable || null,
      lastAppliedVisType: mirrorPatch.visualizationType || settings.visType || null,
      titleText: metric.display || metric.code || ""
    };
    if (_plan && _plan.emptyIntent && _plan.emptyIntent.enabled === true) {
      derived.emptyStatus = "intentional";
      derived.emptyReason = _plan.emptyIntent.reason;
      derived.topNResultValues = [];
    } else {
      derived.emptyStatus = null;
      derived.emptyReason = null;
    }
    return derived;
  }

  function handleApplyBindingFailure(_ctx, _err) {
    if ((_err && _err.name === "AbortError") || _ctx.abortController.signal.aborted) {
      // stale:true is the same dialect as the gate cancels: an abort is silent and
      // finalizePipelineResult then writes no ERROR_RECORDED (E0a).
      return abortedStaleResult(_ctx.widgetId, _ctx.opSeq);
    }
    console.error("[widgetVis.runBindingPipeline] applyBinding failed", _ctx.widgetId, _err);
    return {
      ok: false, widgetId: _ctx.widgetId, opSeq: _ctx.opSeq, status: "error",
      errorCode: "WIDGET_VIS_BINDING_APPLY_FAILED",
      errorMessage: String(_err && _err.message ? _err.message : _err)
    };
  }

  function sweepLegend(_context, _ctx, _input, _plan, _settings) {
    try {
      _legendSweep.sweepLegendCaptions(_ctx.runtime, _ctx.widgetId, {
        widgetId: _ctx.widgetId,
        opSeq: _ctx.opSeq,
        mode: _input.mode,
        reason: _plan && _plan.reason ? _plan.reason : null,
        dimension: _settings.dimension != null ? _settings.dimension : null,
        visType: _settings.visType != null ? _settings.visType : null,
        runtime: _ctx.runtime,
        isStaleOpSeq: _context.isStaleOpSeq.bind(_context)
      });
    } catch (err) {
      console.error("[widgetVis.handleApplyBindingSuccess] legend sweep failed", _ctx.widgetId, err);
    }
  }

  async function handleApplyBindingSuccess(_context, _ctx, _input, _plan, _applyResult, _propertyResult) {
    var widgetId = _ctx.widgetId;
    var opSeq = _ctx.opSeq;
    var signal = _ctx.abortController.signal;
    var settings = _input.settings || {};
    var propertyDiagnostics = _propertyResult && _propertyResult.diagnostics ? _propertyResult.diagnostics : null;
    var normalized = _results.reportApplyResult({
      widgetId: widgetId, opSeq: opSeq, payload: _input.payload || {}, control: _input.control,
      applyResult: _applyResult || {},
      propertyDiagnostics: propertyDiagnostics
    });
    var derived;
    var postRenderPropertyResult;
    var postRenderPropertyDiagnostics;
    var postRender;
    if (normalized.ok !== true || _applyResult.status !== "success") {
      if (isCleanupInput(_input) && _plan.emptyIntent && _plan.emptyIntent.enabled === true) {
        normalized.errorCode = normalized.errorCode || "WIDGET_VIS_EMPTY_APPLY_FAILED";
      }
      return normalized;
    }
    _ctx.runtime.managedFilterItemIds = _plan.managedFilterItemIds || [];
    derived = buildDerivedPatch(_plan, _applyResult, _input);
    if (isCleanupInput(_input)) {
      _ctx.runtime.lastSuccessfulPlan = null;
      normalized.derived = derived;
      return normalized;
    }
    if (isAbortedApply(_context, _ctx)) {
      return abortedStaleResult(widgetId, opSeq);
    }
    _ctx.runtime.lastSuccessfulPlan = _plan;
    sweepLegend(_context, _ctx, _input, _plan, settings);
    await _postRender.applyPrognoseSeriesSegmentIndexes(_ctx._KDB, _plan, widgetId, signal, settings);
    postRenderPropertyResult = await _visProperties.applyVisualizationProperties(_ctx._KDB, {
      widgetId: widgetId,
      visualizationType: settings.visType || _visTypes.resolveDefaultVisualizationType(_ctx._KDB),
      runtime: _ctx.runtime,
      input: _input,
      signal: signal,
      phase: "postRender",
      force: true
    });
    if (isAbortedApply(_context, _ctx) || (postRenderPropertyResult && postRenderPropertyResult.aborted === true)) {
      return abortedStaleResult(widgetId, opSeq);
    }
    postRenderPropertyDiagnostics = postRenderPropertyResult && postRenderPropertyResult.diagnostics ? postRenderPropertyResult.diagnostics : null;
    if (postRenderPropertyDiagnostics) {
      normalized.postRenderPropertyDiagnostics = postRenderPropertyDiagnostics;
    }
    if (!_context.isStaleOpSeq(widgetId, opSeq)) {
      postRender = _postRender.applyPostRenderCleanup({
        _KDB: _ctx._KDB, widgetId: widgetId, opSeq: opSeq, input: _input, plan: _plan,
        applyResult: _applyResult, runtime: _ctx.runtime, isStaleOpSeq: _context.isStaleOpSeq.bind(_context)
      });
      if (postRender && postRender.titleText) {
        derived.titleText = postRender.titleText;
      }
      if (postRender && postRender.diagnostics) {
        normalized.postRenderDiagnostics = postRender.diagnostics;
        if (postRenderPropertyDiagnostics) {
          normalized.postRenderDiagnostics.visualizationProperties = postRenderPropertyDiagnostics;
        }
      } else if (postRenderPropertyDiagnostics) {
        normalized.postRenderDiagnostics = { visualizationProperties: postRenderPropertyDiagnostics };
      }
    }
    normalized.derived = derived;
    return normalized;
  }

  return {
    buildDerivedPatch: buildDerivedPatch,
    handleApplyBindingSuccess: handleApplyBindingSuccess,
    handleApplyBindingFailure: handleApplyBindingFailure,
    isAbortedApply: isAbortedApply,
    abortedStaleResult: abortedStaleResult,
    isCleanupInput: isCleanupInput
  };
});

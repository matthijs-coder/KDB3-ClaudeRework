define([
  "../state/normalizeMetricIdentity.js",
  "./reportApplyResult.js",
  "./applyPostRenderCleanup.js",
  "./applyVisualizationProperties.js",
  "../config/resolveVisualizationBindingConfig.js",
  "../view/sweepLegendCaptions.js",
  "./applyPrognoseSeriesSegmentIndexes.js"
], function (_normalizeMetricIdentity, _reportApplyResult, _applyPostRenderCleanup, _applyVisualizationProperties, _resolveVisualizationBindingConfig, _sweepLegendCaptions, _applyPrognoseSeriesSegmentIndexes) {
  "use strict";

  function isCleanupMode(_input) {
    return !!(_input && (_input.reason === "cleanup" || _input.forceEmpty === true));
  }

  function isAbortedApply(_context, _ctx, _widgetId, _opSeq) {
    if (_context.isStaleOpSeq(_widgetId, _opSeq)) {
      return true;
    }
    return !!(_ctx.abortController && _ctx.abortController.signal && _ctx.abortController.signal.aborted);
  }

  function abortedStaleResult(_widgetId, _opSeq) {
    return { ok: false, widgetId: _widgetId, opSeq: _opSeq, stale: true, status: "aborted" };
  }

  function buildDerivedPatch(_plan, _applyResult, _input) {
    var metric = _normalizeMetricIdentity.normalizeMetricIdentity((_input && _input.metric) || {});
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

  function handleApplyBindingFailure(_context, _ctx, err) {
    var widgetId = _ctx.widgetId;
    var opSeq = _ctx.opSeq;
    if ((err && err.name === "AbortError") || (_ctx.abortController && _ctx.abortController.signal && _ctx.abortController.signal.aborted)) {
      // stale:true = zelfde dialect als de gate-cancels: aborted is stil,
      // finalizePipelineResult schrijft dan geen ERROR_RECORDED (E0a).
      return { ok: false, stale: true, widgetId: widgetId, opSeq: opSeq, status: "aborted" };
    }
    console.error("[widgetVis.runBindingPipeline] applyBinding failed", widgetId, err);
    return {
      ok: false, widgetId: widgetId, opSeq: opSeq, status: "error",
      errorCode: "WIDGET_VIS_BINDING_APPLY_FAILED",
      errorMessage: String(err && err.message ? err.message : err)
    };
  }

  function handleApplyBindingSuccess(_context, _ctx, _input, _plan, _applyResult, _propertyResult) {
    var widgetId = _ctx.widgetId;
    var opSeq = _ctx.opSeq;
    var normalized = _reportApplyResult({
      widgetId: widgetId, opSeq: opSeq, payload: _input.payload || {}, control: _input.control,
      applyResult: _applyResult || {},
      propertyDiagnostics: _propertyResult && _propertyResult.diagnostics ? _propertyResult.diagnostics : null
    });
    if (normalized.ok !== true || _applyResult.status !== "success") {
      if (isCleanupMode(_input) && _plan.emptyIntent && _plan.emptyIntent.enabled === true) {
        normalized.errorCode = normalized.errorCode || "WIDGET_VIS_EMPTY_APPLY_FAILED";
      }
      return normalized;
    }
    _ctx.runtime.managedFilterItemIds = _plan.managedFilterItemIds || [];
    var derived = buildDerivedPatch(_plan, _applyResult, _input);
    if (isCleanupMode(_input)) {
      _ctx.runtime.lastSuccessfulPlan = null;
      normalized.derived = derived;
      return normalized;
    }
    if (isAbortedApply(_context, _ctx, widgetId, opSeq)) {
      return abortedStaleResult(widgetId, opSeq);
    }
    _ctx.runtime.lastSuccessfulPlan = _plan;
    var settings = (_input && _input.settings) || {};
    var postRenderVisType = settings.visType
      || _resolveVisualizationBindingConfig.resolveDefaultVisualizationType(_ctx._KDB);
    try {
      _sweepLegendCaptions(_ctx.runtime, widgetId, {
        widgetId: widgetId,
        opSeq: opSeq,
        reason: _plan && _plan.reason ? _plan.reason : null,
        dimension: settings.dimension != null ? settings.dimension : null,
        visType: settings.visType != null ? settings.visType : null,
        runtime: _ctx.runtime,
        isStaleOpSeq: _context.isStaleOpSeq.bind(_context)
      });
    } catch (err) {
      console.error("[widgetVis.handleApplyBindingSuccess] legend sweep failed", widgetId, err);
    }
    return Promise.resolve(_applyPrognoseSeriesSegmentIndexes(_ctx._KDB, _plan, widgetId, _ctx.abortController.signal, settings)).then(
      _applyVisualizationProperties.bind(null, _ctx._KDB, {
        widgetId: widgetId, visualizationType: postRenderVisType, runtime: _ctx.runtime, input: _input,
        signal: _ctx.abortController.signal, phase: "postRender", force: true
      })
    ).then(function (postRenderPropertyResult) {
      var postRenderPropertyDiagnostics;
      var postRender;
      if (isAbortedApply(_context, _ctx, widgetId, opSeq)
        || (postRenderPropertyResult && postRenderPropertyResult.aborted === true)) {
        return abortedStaleResult(widgetId, opSeq);
      }
      postRenderPropertyDiagnostics = postRenderPropertyResult && postRenderPropertyResult.diagnostics
        ? postRenderPropertyResult.diagnostics : null;
      if (postRenderPropertyDiagnostics) {
        normalized.postRenderPropertyDiagnostics = postRenderPropertyDiagnostics;
      }
      if (!_context.isStaleOpSeq(widgetId, opSeq)) {
        postRender = _applyPostRenderCleanup({
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
    });
  }

  return {
    buildDerivedPatch: buildDerivedPatch,
    handleApplyBindingSuccess: handleApplyBindingSuccess,
    handleApplyBindingFailure: handleApplyBindingFailure
  };
});

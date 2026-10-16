define([
  "./buildBindingSpec.js",
  "./buildDerivedPatch.js",
  "../config.js",
  "../view/resolveLegendQueryRoot.js",
  "../view/legend/installLegendTextObserver.js"
], function (_buildBindingSpec, _buildDerivedPatch, _config, _resolveLegendQueryRoot, _installLegendTextObserver) {
  "use strict";

  function isCleanupMode(_input) {
    return !!(_input && (_input.reason === "cleanup" || _input.forceEmpty === true));
  }

  function installLegendObserverBeforeApply(_context, _input, _ctx) {
    try {
      var settings = (_input && _input.settings) || {};
      var legendRoot = _resolveLegendQueryRoot(_ctx.runtime, _ctx.widgetId);
      if (!legendRoot.queryRoot) {
        return {
          action: "skipped",
          reason: legendRoot.skipReason || "no_query_root"
        };
      }
      return _installLegendTextObserver(legendRoot.queryRoot, {
        widgetId: _ctx.widgetId,
        opSeq: _ctx.opSeq,
        reason: "preApplyBinding",
        dimension: settings.dimension != null ? settings.dimension : null,
        visType: settings.visType != null ? settings.visType : null,
        runtime: _ctx.runtime,
        isStaleOpSeq: _context.isStaleOpSeq,
        skipReason: legendRoot.skipReason,
        isShell: legendRoot.isShell === true
      });
    } catch (err) {
      console.error("[widgetVis.continueBindingPlanAndApply] legend observer install failed", _ctx.widgetId, err);
      return { action: "failed", error: String(err && err.message ? err.message : err) };
    }
  }

  function continueBindingPlanAndApply(_context, _input, _ctx, _propertyResult) {
    var widgetId = _ctx.widgetId;
    var opSeq = _ctx.opSeq;
    var spec = _buildBindingSpec(_ctx._KDB, Object.assign({}, _input, { widgetId: widgetId, opSeq: opSeq }));
    var plan = _ctx.planService.buildPlan(spec);
    if (!plan || plan.ok !== true || plan.status !== "success") {
      var planDiagnostics = plan && plan.diagnostics ? plan.diagnostics : {};
      var mergedPlanDiagnostics = Object.assign({}, planDiagnostics);
      if (_propertyResult && _propertyResult.diagnostics) {
        mergedPlanDiagnostics.visualizationProperties = _propertyResult.diagnostics;
      }
      return Promise.resolve({
        ok: false, widgetId: widgetId, opSeq: opSeq, status: "error",
        errorCode: "WIDGET_VIS_BINDING_PLAN_FAILED",
        errorMessage: plan && plan.errorMessage ? plan.errorMessage : "Binding plan failed.",
        diagnostics: Object.keys(mergedPlanDiagnostics).length ? mergedPlanDiagnostics : null,
        propertyDiagnostics: _propertyResult && _propertyResult.diagnostics ? _propertyResult.diagnostics : null
      });
    }
    if (_context.isStaleOpSeq(widgetId, opSeq)) {
      return Promise.resolve({ ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" });
    }
    var applyService = _ctx._KDB.services && _ctx._KDB.services.widgetBindingApply;
    if (!applyService || typeof applyService.applyBinding !== "function") {
      if (isCleanupMode(_input)) {
        var missingApplyCode = plan.emptyIntent && plan.emptyIntent.enabled === true
          ? "WIDGET_VIS_EMPTY_APPLY_FAILED" : "WIDGET_VIS_BINDING_APPLY_FAILED";
        return Promise.resolve({
          ok: false, widgetId: widgetId, opSeq: opSeq, status: "error",
          errorCode: missingApplyCode,
          errorMessage: "widgetBindingApply.applyBinding is not registered."
        });
      }
      return Promise.resolve({
        ok: true, widgetId: widgetId, opSeq: opSeq, status: "skipped", skipped: true,
        diagnostics: { propertyDiagnostics: _propertyResult && _propertyResult.diagnostics ? _propertyResult.diagnostics : null }
      });
    }
    var applyOptions = {
      target: { widgetId: widgetId, targetKind: "vis", ownerWidgetId: null, opSeq: opSeq, reason: plan.reason },
      signal: _ctx.abortController.signal,
      previousManagedFilterItemIds: _ctx.runtime.managedFilterItemIds || [],
      timeoutProfile: _config.applyTimeoutProfile
    };
    if (_input && _input.payload && _input.payload.deferRenderWait === true) {
      applyOptions.renderWait = { waitForStart: false, waitForComplete: false };
    }
    if (!isCleanupMode(_input)) {
      installLegendObserverBeforeApply(_context, _input, _ctx);
    }
    return Promise.resolve(applyService.applyBinding(plan, applyOptions)).then(function (applyResult) {
      if (_context.isStaleOpSeq(widgetId, opSeq)
        || (_ctx.abortController && _ctx.abortController.signal && _ctx.abortController.signal.aborted)) {
        return { ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" };
      }
      return _buildDerivedPatch.handleApplyBindingSuccess(_context, _ctx, _input, plan, applyResult, _propertyResult);
    }).catch(_buildDerivedPatch.handleApplyBindingFailure.bind(null, _context, _ctx));
  }

  return continueBindingPlanAndApply;
});

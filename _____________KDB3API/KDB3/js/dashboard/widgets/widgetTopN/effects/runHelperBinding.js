define([
  "../../widgetVis/effects/applyVisualizationProperties.js",
  "./effectResultHelpers.js",
  "./dismissHelperTitleEdit.js"
], function (_applyVisualizationProperties, _helpers, _dismissHelperTitleEdit) {
  "use strict";

  async function __controller(_deps, _context) {
    try {
      var services = _deps && _deps._KDB ? _deps._KDB.services || {} : {};
      if (!services.widgetBindingPlan || typeof services.widgetBindingPlan.buildPlan !== "function") {
        return _helpers.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "widgetBindingPlan.buildPlan is unavailable.");
      }
      if (!services.widgetBindingApply || typeof services.widgetBindingApply.applyBinding !== "function") {
        return _helpers.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "widgetBindingApply.applyBinding is unavailable.");
      }
      var preProperties = await applyHelperVisualizationProperties(_deps._KDB, _context, "preBinding", false);
      if (hasPropertyBlockers(preProperties)) {
        return _helpers.failure("WIDGET_TOPN_HELPER_VISUALIZATION_PROPERTY_BLOCKED", "TopN helper visualization property apply blocked.", preProperties.diagnostics);
      }
      var plan = services.widgetBindingPlan.buildPlan(_context.spec);
      if (!plan || plan.ok !== true || plan.status !== "success") {
        return _helpers.failure("WIDGET_TOPN_HELPER_PLAN_FAILED", _helpers.readPlanError(plan), { plan: plan, preProperties: preProperties });
      }
      if (_helpers.isAborted(_context.signal)) {
        return aborted(plan);
      }
      var applyResult = await services.widgetBindingApply.applyBinding(plan, _helpers.buildHelperApplyOptions(_context, plan));
      if (_helpers.isAborted(_context.signal) || isApplyAborted(applyResult)) {
        return aborted(plan, applyResult);
      }
      var normalized = normalizeApplyResult(plan, applyResult, preProperties);
      if (normalized.ok !== true) {
        return normalized;
      }
      var postProperties = await applyHelperVisualizationProperties(_deps._KDB, _context, "postRender", true);
      if (postProperties && postProperties.diagnostics) {
        normalized.postRenderPropertyDiagnostics = postProperties.diagnostics;
      }
      return normalized;
    } catch (err) {
      if (_helpers.isAbortError(err) || _helpers.isAborted(_context && _context.signal)) {
        return _helpers.staleAborted();
      }
      console.error("[widgetTopN.runHelperBinding] failed", { ownerVisId: _context && _context.ownerVisId }, err);
      return _helpers.failure("WIDGET_TOPN_HELPER_APPLY_FAILED", _helpers.messageFromError(err));
    } finally {
      // Helper still parked beside owner here; restore runs after this returns.
      if (_context && _context.helperWidgetId) {
        _dismissHelperTitleEdit(_deps && _deps._KDB, _context.helperWidgetId);
      }
    }
  }

  function applyHelperVisualizationProperties(_KDB, _context, phase, force) {
    var dataConfig = _context.spec && _context.spec.dataConfig || {};
    return _applyVisualizationProperties(_KDB, {
      widgetId: _context.helperWidgetId,
      visualizationType: dataConfig.visualizationType || "TopN",
      runtime: _context.ownerRuntime || {},
      input: { reason: "visType" },
      signal: _context.signal,
      phase: phase,
      force: force === true,
      omitTitleMode: true
    });
  }

  function hasPropertyBlockers(result) {
    var blockers = result && result.diagnostics && result.diagnostics.blockers;
    return Array.isArray(blockers) && blockers.length > 0;
  }

  function normalizeApplyResult(plan, applyResult, preProperties) {
    if (!applyResult || applyResult.status === "error") {
      return _helpers.failure("WIDGET_TOPN_HELPER_APPLY_FAILED", _helpers.readApplyError(applyResult), { plan: plan, applyResult: applyResult });
    }
    if (applyResult.status === "timeout") {
      return _helpers.failure("WIDGET_TOPN_HELPER_APPLY_TIMEOUT", _helpers.readApplyError(applyResult), { plan: plan, applyResult: applyResult });
    }
    if (applyResult.status !== "success") {
      return _helpers.failure("WIDGET_TOPN_HELPER_APPLY_FAILED", _helpers.readApplyError(applyResult), { plan: plan, applyResult: applyResult });
    }
    return {
      ok: true,
      status: "success",
      plan: plan,
      applyResult: applyResult,
      managedFilterItemIds: plan.managedFilterItemIds || [],
      diagnostics: Object.assign({}, applyResult.diagnostics || {}, {
        visualizationProperties: preProperties && preProperties.diagnostics ? preProperties.diagnostics : null
      })
    };
  }

  function aborted(plan, applyResult) {
    return Object.assign(_helpers.staleAborted({ plan: plan, applyResult: applyResult || null }), { diagnostics: { plan: plan, applyResult: applyResult || null } });
  }

  function isApplyAborted(result) {
    return !!(result && result.status === "aborted");
  }

  return __controller;
});

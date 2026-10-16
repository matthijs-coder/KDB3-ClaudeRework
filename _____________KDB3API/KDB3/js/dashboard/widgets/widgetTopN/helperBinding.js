define([
  "../widgetVis/effects/applyVisualizationProperties.js",
  "./config.js",
  "./results.js",
  "./helperPlacement.js"
], function (_applyVisualizationProperties, _config, _results, _placement) {
  "use strict";

  function readBindingServices(_KDB) {
    var services = _KDB && _KDB.services ? _KDB.services : {};
    if (!services.widgetBindingPlan || typeof services.widgetBindingPlan.buildPlan !== "function") {
      return _results.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "widgetBindingPlan.buildPlan is unavailable.");
    }
    if (!services.widgetBindingApply || typeof services.widgetBindingApply.applyBinding !== "function") {
      return _results.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "widgetBindingApply.applyBinding is unavailable.");
    }
    return { ok: true, plan: services.widgetBindingPlan, apply: services.widgetBindingApply };
  }

  // Boundary for the helper apply: Cognos and binding-service failures become
  // TopN error codes so the owner still receives a terminal result.
  async function runHelperBinding(_KDB, _context) {
    try {
      var services = readBindingServices(_KDB);
      if (services.ok !== true) {
        return services;
      }
      var bindingService = _KDB.services && _KDB.services.widgetBinding;
      var preProperties = await applyHelperVisualizationProperties(_KDB, _context, "preBinding", false);
      if (hasPropertyBlockers(preProperties)) {
        return _results.failure(
          "WIDGET_TOPN_HELPER_VISUALIZATION_PROPERTY_BLOCKED",
          "TopN helper visualization property apply blocked.",
          preProperties.diagnostics
        );
      }
      var outcome = bindingService ? await bindingService.run(_context.spec, {
        beforeApply: function () { return !_results.isAborted(_context.signal); },
        applyOptions: function (plan) { return buildHelperApplyOptions(_context, plan); }
      }) : { stage: "unavailable" };
      if (outcome.stage === "unavailable") {
        outcome = await planAndApplyDirect(services, _context);
      }
      var plan = outcome.plan;
      if (outcome.stage === "plan") {
        return _results.failure("WIDGET_TOPN_HELPER_PLAN_FAILED", readPlanError(plan), { plan: plan, preProperties: preProperties });
      }
      if (outcome.stage === "cancelled") {
        return abortedApply(plan, null);
      }
      var applyResult = outcome.applyResult;
      if (_results.isAborted(_context.signal) || (applyResult && applyResult.status === "aborted")) {
        return abortedApply(plan, applyResult);
      }
      var normalized = normalizeApplyResult(plan, applyResult, preProperties);
      if (normalized.ok !== true) {
        return normalized;
      }
      var postProperties = await applyHelperVisualizationProperties(_KDB, _context, "postRender", true);
      if (postProperties && postProperties.diagnostics) {
        normalized.postRenderPropertyDiagnostics = postProperties.diagnostics;
      }
      return normalized;
    } catch (err) {
      if (_results.isAbortError(err) || _results.isAborted(_context.signal)) {
        return _results.staleAborted();
      }
      console.error("[widgetTopN.runHelperBinding] failed", { ownerVisId: _context.ownerVisId }, err);
      return _results.failure("WIDGET_TOPN_HELPER_APPLY_FAILED", _results.messageFromError(err));
    } finally {
      // Helper still parked beside owner here; restore runs after this returns.
      _placement.dismissHelperTitleEdit(_KDB, _context.helperWidgetId);
    }
  }

  // `run` reads the services from _KDB.services on every call and answers "unavailable" once the dashboard was torn
  // down (services set to null) while this flow was waiting; the services captured at the start still finish it.
  async function planAndApplyDirect(_services, _context) {
    var plan = _services.plan.buildPlan(_context.spec);
    if (!plan || plan.ok !== true || plan.status !== "success") {
      return { stage: "plan", plan: plan, applyResult: null };
    }
    if (_results.isAborted(_context.signal)) {
      return { stage: "cancelled", plan: plan, applyResult: null };
    }
    return { stage: "applied", plan: plan, applyResult: await _services.apply.applyBinding(plan, buildHelperApplyOptions(_context, plan)) };
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
    var diagnostics = { plan: plan, applyResult: applyResult };
    if (!applyResult || applyResult.status === "error") {
      return _results.failure("WIDGET_TOPN_HELPER_APPLY_FAILED", readApplyError(applyResult), diagnostics);
    }
    if (applyResult.status === "timeout") {
      return _results.failure("WIDGET_TOPN_HELPER_APPLY_TIMEOUT", readApplyError(applyResult), diagnostics);
    }
    if (applyResult.status !== "success") {
      return _results.failure("WIDGET_TOPN_HELPER_APPLY_FAILED", readApplyError(applyResult), diagnostics);
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

  function abortedApply(plan, applyResult) {
    return _results.staleAborted({ plan: plan, applyResult: applyResult || null });
  }

  // Boundary for the helper read: render the parked helper, then read its rows
  // through tableData. Failures become WIDGET_TOPN_FLAT_DATA_* codes.
  async function readHelperTableRows(_KDB, _context) {
    try {
      var service = _KDB && _KDB.services ? _KDB.services.tableData : null;
      if (!service || typeof service.reloadTable !== "function") {
        return _results.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "tableData.reloadTable is unavailable.");
      }
      if (_results.isAborted(_context.signal)) {
        return _results.staleAborted();
      }
      var render = await renderHelperBeforeRead(_KDB, _context);
      if (render.ok !== true) {
        return render;
      }
      var rows = await service.reloadTable(buildReadInput(_context));
      if (_results.isAborted(_context.signal)) {
        return _results.staleAborted({ rows: rows });
      }
      return normalizeReadResult(rows, _context);
    } catch (err) {
      if (_results.isAbortError(err) || _results.isAborted(_context.signal)) {
        return _results.staleAborted();
      }
      console.error("[widgetTopN.readHelperTableRows] failed", { ownerVisId: _context.ownerVisId }, err);
      return _results.failure("WIDGET_TOPN_FLAT_DATA_FAILED", _results.messageFromError(err));
    }
  }

  async function renderHelperBeforeRead(_KDB, _context) {
    var rt = _KDB.runtime ? _KDB.runtime.widgetTopN : null;
    var widgetsFacet = rt ? rt.widgetsFacet : null;
    var outcome = null;
    if (widgetsFacet && typeof widgetsFacet.renderWidget === "function") {
      outcome = await widgetsFacet.renderWidget(_context.helperWidgetId, { signal: _context.signal });
    }
    if (_results.isAborted(_context.signal) || isAbortedOutcome(outcome)) {
      return _results.staleAborted();
    }
    if (!outcome || outcome.ok !== true) {
      console.error("[widgetTopN.readHelperTableRows] helper render failed", { ownerVisId: _context.ownerVisId, outcome: outcome });
      return _results.failure("WIDGET_TOPN_FLAT_DATA_FAILED", "cognosAPI.widgets.renderWidget is unavailable.");
    }
    return { ok: true };
  }

  function isAbortedOutcome(outcome) {
    return !!(outcome && (
      outcome.outcome === "aborted" ||
      outcome.aborted === true ||
      outcome.reason === "aborted" ||
      outcome.reason === "aborted-after-effect" ||
      outcome.reason === "disposed"
    ));
  }

  function buildReadInput(_context) {
    return [{ widgetId: _context.helperWidgetId, role: "topNHelper", shape: "row", pick: _config.HELPER_READ_PICK }];
  }

  function normalizeReadResult(rows, _context) {
    if (rows == null) {
      return _results.failure("WIDGET_TOPN_FLAT_DATA_TIMEOUT", "tableData returned no helper rows before timeout.", { rows: rows });
    }
    var normalizedRows = Array.isArray(rows) ? rows : [];
    var colKeys = readColumnKeys(normalizedRows);
    var diagnostics = {
      service: "tableData",
      operation: "reloadTable",
      targetWidgetId: _context.helperWidgetId,
      targetKind: "topNHelper",
      ownerWidgetId: _context.ownerVisId,
      opSeq: _context.opSeq,
      rowCount: normalizedRows.length,
      colKeys: colKeys
    };
    return {
      ok: true,
      status: "success",
      readResult: {
        status: "success",
        rows: normalizedRows,
        diagnostics: diagnostics,
        raw: { colKeys: colKeys, source: "tableData.reloadTable", pick: _config.HELPER_READ_PICK.slice() }
      },
      diagnostics: diagnostics
    };
  }

  function readColumnKeys(rows) {
    var first = rows.length ? rows[0] : null;
    if (!first || typeof first !== "object" || Array.isArray(first)) {
      return [];
    }
    return Object.keys(first);
  }

  function buildHelperApplyOptions(context, plan) {
    return {
      target: {
        widgetId: context.helperWidgetId,
        targetKind: "topNHelper",
        ownerWidgetId: context.ownerVisId,
        opSeq: context.opSeq,
        reason: plan.reason
      },
      signal: context.signal,
      previousManagedFilterItemIds: context.previousManagedFilterItemIds ||
        (context.ownerRuntime && context.ownerRuntime.helperManagedFilterItemIds) || [],
      timeoutProfile: "helper"
    };
  }

  function readPlanError(plan) {
    return String(plan && (plan.errorMessage || plan.errorCode) ? plan.errorMessage || plan.errorCode : "Helper plan failed.");
  }

  function readApplyError(applyResult) {
    var diagnostics = applyResult && applyResult.diagnostics ? applyResult.diagnostics : {};
    return String(diagnostics.errorMessage || diagnostics.errorCode || "Helper apply failed.");
  }

  return {
    readBindingServices: readBindingServices,
    runHelperBinding: runHelperBinding,
    readHelperTableRows: readHelperTableRows,
    buildHelperApplyOptions: buildHelperApplyOptions,
    readPlanError: readPlanError,
    readApplyError: readApplyError
  };
});

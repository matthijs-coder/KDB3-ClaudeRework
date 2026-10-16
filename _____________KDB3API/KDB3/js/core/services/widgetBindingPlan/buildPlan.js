define([
  "./config.js",
  "./planIntent.js",
  "./planResult.js",
  "./parseTopNOption.js",
  "./slots/buildSlotPlan.js",
  "./filters/buildLocalFilters.js",
], function (_config, _planIntent, _planResult, _parseTopNOption, _buildSlotPlan, _buildLocalFilters) {
  "use strict";

  function validateSpec(_spec) {
    if (!_spec || typeof _spec !== "object") {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_SPEC", message: "Binding plan spec is required." };
    }
    if (!_config.PLAN_TARGET_KINDS[_spec.targetKind]) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_INVALID_TARGET", message: "targetKind is missing or unsupported." };
    }
    var dataConfig = _spec.dataConfig;
    var config = _spec.config;
    if (!dataConfig || typeof dataConfig !== "object") {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_SPEC", message: "dataConfig is required." };
    }
    if (!dataConfig.datasourceId) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_DATASOURCE", message: "dataConfig.datasourceId is required." };
    }
    if (!dataConfig.visualizationType || !dataConfig.visTypeConfig) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_VISUALIZATION", message: "visualizationType and visTypeConfig are required." };
    }
    if (!config || !config.filterPropObj || !config.parameterMappingObj || !config.topNOptions) {
      return { ok: false, code: "WIDGET_BINDING_PLAN_MISSING_SPEC", message: "config snapshots are required." };
    }
    return { ok: true, dataConfig: dataConfig };
  }

  function resolveCanonicalVisType(_dataConfig) {
    var canonical = _dataConfig && _dataConfig.canonicalVisType;
    return canonical != null && String(canonical).trim() ? String(canonical).trim() : null;
  }

  function buildBaseIdentity(_dataConfig) {
    return {
      datasource: {
        id: String(_dataConfig.datasourceId),
        name: _dataConfig.datasourceName == null ? null : String(_dataConfig.datasourceName),
      },
      visualization: {
        visType: String(_dataConfig.visualizationType),
        canonicalVisType: resolveCanonicalVisType(_dataConfig),
        cognosVisualizationTypeId: _dataConfig.cognosVisualizationTypeId || null,
      },
    };
  }

  function buildPlanSuccess(_spec, _planned) {
    var resetOnlyCleanup = _planIntent.isResetOnlyCleanup(_spec, _planned.resetIntent);
    return _planResult.createPlanSuccess({
      reason: _spec.reason,
      targetKind: _spec.targetKind,
      widgetId: _spec.widgetId,
      ownerWidgetId: _spec.ownerWidgetId,
      opSeq: _spec.opSeq,
      datasource: _planned.base.datasource,
      visualization: _planned.base.visualization,
      slots: resetOnlyCleanup ? [] : _planned.slotResult.slots,
      localFilters: resetOnlyCleanup ? [] : _planned.filterResult.localFilters,
      managedFilterItemIds: resetOnlyCleanup ? [] : _planned.filterResult.managedFilterItemIds,
      emptyIntent: _planned.emptyIntent,
      resetIntent: _planned.resetIntent,
      mirrorPatch: resetOnlyCleanup ? {} : _planResult.buildMirrorPatch(_spec, _planned.parsedTopN, _planned.filterResult),
      slotsChanged: _planIntent.computeSlotsChanged(_spec.reason, _planned.emptyIntent),
      diagnostics: _planned.diagnostics,
    });
  }

  /**
   * Builds a binding plan from a spec. Synchronous; never throws (internal errors become
   * WIDGET_BINDING_PLAN_INTERNAL failures).
   */
  function buildPlan(_spec) {
    var diagnostics = _planResult.createPlanDiagnostics(_spec);
    try {
      var validation = validateSpec(_spec);
      if (!validation.ok) {
        return _planResult.createPlanFailure(_spec, diagnostics, "validateSpec", validation.code, validation.message);
      }
      var dataConfig = validation.dataConfig;
      var base = buildBaseIdentity(dataConfig);
      var emptyIntentResult = _planIntent.resolveEmptyIntent(_spec);
      if (!emptyIntentResult.ok) {
        return _planResult.createPlanFailure(_spec, diagnostics, "buildFilters", emptyIntentResult.code, emptyIntentResult.message, base);
      }
      var emptyIntent = emptyIntentResult.emptyIntent;
      diagnostics.emptyIntent = emptyIntent;
      var resetIntent = _planIntent.resolveResetIntent(_spec);
      diagnostics.resetIntent = resetIntent;
      if (_planIntent.isVisResetOnlyCleanup(_spec, resetIntent)) {
        return _planResult.buildVisResetOnlyPlan(_spec, base, emptyIntent, resetIntent, diagnostics);
      }
      var parsedTopN = _parseTopNOption(dataConfig.topN, _spec.config.topNOptions);
      if (parsedTopN.kind === "default") {
        diagnostics.warnings.push({ code: "WIDGET_BINDING_PLAN_TOPN_DEFAULTED", message: "TopN input collapsed to default/none.", field: "dataConfig.topN" });
      }
      var slotResult = _buildSlotPlan(_spec, parsedTopN, diagnostics);
      if (!slotResult.ok) {
        var slotCode = slotResult.errorCode || "WIDGET_BINDING_PLAN_SLOT_FAILED";
        return _planResult.createPlanFailure(_spec, diagnostics, "buildSlots", slotCode, "Slot planning failed.", base);
      }
      var filterResult = _buildLocalFilters(_spec, parsedTopN, emptyIntent, diagnostics);
      if (!filterResult.ok) {
        var filterCode = filterResult.errorCode || "WIDGET_BINDING_PLAN_FILTER_FAILED";
        return _planResult.createPlanFailure(_spec, diagnostics, "buildFilters", filterCode, "Filter planning failed.", base);
      }
      return buildPlanSuccess(_spec, {
        base: base,
        emptyIntent: emptyIntent,
        resetIntent: resetIntent,
        parsedTopN: parsedTopN,
        slotResult: slotResult,
        filterResult: filterResult,
        diagnostics: diagnostics,
      });
    } catch (error) {
      console.error("[widgetBindingPlan.buildPlan] unexpected planning error", {
        reason: _spec && _spec.reason,
        targetKind: _spec && _spec.targetKind,
        widgetId: _spec && _spec.widgetId,
        error: error && error.message,
      });
      return _planResult.createPlanFailure(_spec, diagnostics, null, "WIDGET_BINDING_PLAN_INTERNAL", "Unexpected binding plan failure.");
    }
  }

  return buildPlan;
});

define([
  "./parsing/parseTopNOption.js",
  "./slots/buildSlotPlan.js",
  "./filters/buildLocalFilters.js",
  "./mirror/buildMirrorPatch.js",
  "./diagnostics/createPlanDiagnostics.js",
  "./diagnostics/planFailureContext.js",
  "./diagnostics/createPlanSuccess.js",
  "./validate/validateSpec.js",
  "./intent/resolveEmptyIntent.js",
  "./intent/resolveResetIntent.js",
  "./policy/slotsChangedPolicy.js",
  "./policy/buildVisResetOnlyPlan.js",
], function (
  _parseTopNOption,
  _buildSlotPlan,
  _buildLocalFilters,
  _buildMirrorPatch,
  _createPlanDiagnostics,
  _planFailureContext,
  _createPlanSuccess,
  _validateSpec,
  _resolveEmptyIntent,
  _resolveResetIntent,
  _slotsChangedPolicy,
  _buildVisResetOnlyPlan
) {
  "use strict";

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

  function __controller(_spec) {
    var diagnostics = _createPlanDiagnostics(_spec);
    try {
      var validation = _validateSpec(_spec);
      if (!validation.ok) {
        return _planFailureContext.createPlanFailure(_spec, diagnostics, "validateSpec", validation.code, validation.message, validation.legacy);
      }
      var dataConfig = validation.dataConfig;
      var base = buildBaseIdentity(dataConfig);
      var emptyIntentResult = _resolveEmptyIntent(_spec);
      if (!emptyIntentResult.ok) {
        return _planFailureContext.createPlanFailure(_spec, diagnostics, "buildFilters", emptyIntentResult.code, emptyIntentResult.message, null, base);
      }
      diagnostics.emptyIntent = emptyIntentResult.emptyIntent;
      var resetIntent = _resolveResetIntent(_spec);
      diagnostics.resetIntent = resetIntent;
      if (_slotsChangedPolicy.isVisResetOnlyCleanup(_spec, resetIntent)) {
        return _buildVisResetOnlyPlan(_spec, base, emptyIntentResult.emptyIntent, resetIntent, diagnostics);
      }
      var parsedTopN = _parseTopNOption(dataConfig.topN, _spec.config.topNOptions);
      if (parsedTopN.kind === "default") {
        diagnostics.warnings.push({ code: "WIDGET_BINDING_PLAN_TOPN_DEFAULTED", message: "TopN input collapsed to default/none.", field: "dataConfig.topN" });
      }
      var slotResult = _buildSlotPlan(_spec, parsedTopN, diagnostics);
      if (!slotResult.ok) {
        return _planFailureContext.createPlanFailure(_spec, diagnostics, "buildSlots", slotResult.errorCode || "WIDGET_BINDING_PLAN_SLOT_FAILED", "Slot planning failed.", slotResult.legacyError || "buildSlotPlanFailed", base);
      }
      var filterResult = _buildLocalFilters(_spec, parsedTopN, emptyIntentResult.emptyIntent, diagnostics);
      if (!filterResult.ok) {
        return _planFailureContext.createPlanFailure(_spec, diagnostics, "buildFilters", filterResult.errorCode || "WIDGET_BINDING_PLAN_FILTER_FAILED", "Filter planning failed.", filterResult.legacyError || "buildFilterDescriptorsFailed", base);
      }
      var resetOnlyCleanup = _slotsChangedPolicy.isResetOnlyCleanup(_spec, resetIntent);
      var effectiveSlots = resetOnlyCleanup ? [] : slotResult.slots;
      var effectiveFilters = resetOnlyCleanup ? [] : filterResult.localFilters;
      var effectiveManagedIds = resetOnlyCleanup ? [] : filterResult.managedFilterItemIds;
      return _createPlanSuccess({
        reason: _spec.reason,
        targetKind: _spec.targetKind,
        widgetId: _spec.widgetId,
        ownerWidgetId: _spec.ownerWidgetId,
        opSeq: _spec.opSeq,
        datasource: base.datasource,
        visualization: base.visualization,
        slots: effectiveSlots,
        localFilters: effectiveFilters,
        managedFilterItemIds: effectiveManagedIds,
        emptyIntent: emptyIntentResult.emptyIntent,
        resetIntent: resetIntent,
        mirrorPatch: resetOnlyCleanup ? {} : _buildMirrorPatch(_spec, parsedTopN, filterResult),
        slotsChanged: _slotsChangedPolicy.computeSlotsChanged(_spec.reason, emptyIntentResult.emptyIntent),
        diagnostics: diagnostics,
      });
    } catch (error) {
      console.error("[widgetBindingPlan.buildPlan] unexpected planning error", { reason: _spec && _spec.reason, targetKind: _spec && _spec.targetKind, widgetId: _spec && _spec.widgetId, error: error && error.message });
      return _planFailureContext.createPlanFailure(_spec, diagnostics, null, "WIDGET_BINDING_PLAN_INTERNAL", "Unexpected binding plan failure.", "buildBindingPlanFailed");
    }
  }

  return __controller;
});

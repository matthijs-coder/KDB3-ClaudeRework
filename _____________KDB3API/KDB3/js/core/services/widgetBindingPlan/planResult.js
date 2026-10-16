define([
  "./config.js",
  "./planIntent.js",
  "./defaults/normalizeDefaultValue.js",
  "../../utils/kit/data.js",
], function (_config, _planIntent, _normalizeDefaultValue, _data) {
  "use strict";

  function createPlanDiagnostics(_spec) {
    var spec = _spec && typeof _spec === "object" ? _spec : {};
    var empty = spec.emptyIntent && typeof spec.emptyIntent === "object" ? spec.emptyIntent : {};
    return {
      service: "widgetBindingPlan",
      operation: "buildPlan",
      reason: spec.reason == null ? null : String(spec.reason),
      targetKind: spec.targetKind == null ? "" : String(spec.targetKind),
      widgetId: spec.widgetId == null ? null : String(spec.widgetId),
      ownerWidgetId: spec.ownerWidgetId == null ? null : String(spec.ownerWidgetId),
      opSeq: typeof spec.opSeq === "number" ? spec.opSeq : null,
      emptyIntent: {
        enabled: empty.enabled === true,
        reason: empty.reason == null ? null : String(empty.reason),
        itemId: empty.itemId == null ? null : String(empty.itemId),
        value: empty.value === "1" ? "1" : null,
      },
      failedStage: null,
      warnings: [],
      counts: {
        slotCount: 0,
        localFilterCount: 0,
        managedFilterCount: 0,
      },
    };
  }

  // The diagnostics copy keeps diagnostics.emptyIntent/resetIntent apart from the plan's own intent objects.
  // The mirrorPatch copy drops undefined members and detaches topN result values from the filter descriptors.
  function createPlanSuccess(_context) {
    var diagnostics = _data.cloneJson(_context.diagnostics);
    var slots = _context.slots;
    var localFilters = _context.localFilters;
    var managedFilterItemIds = _context.managedFilterItemIds;
    diagnostics.counts = {
      slotCount: slots.length,
      localFilterCount: localFilters.length,
      managedFilterCount: managedFilterItemIds.length,
    };
    return {
      ok: true,
      status: "success",
      errorCode: null,
      errorMessage: null,
      reason: _context.reason == null ? null : String(_context.reason),
      targetKind: _context.targetKind || "vis",
      widgetId: _context.widgetId == null ? null : String(_context.widgetId),
      ownerWidgetId: _context.ownerWidgetId == null ? null : String(_context.ownerWidgetId),
      opSeq: typeof _context.opSeq === "number" ? _context.opSeq : null,
      datasource: _context.datasource,
      visualization: _context.visualization,
      slotsChanged: _context.slotsChanged === true,
      slotsToClear: _context.slotsChanged === true ? ["all"] : [],
      slots: slots,
      localFilters: localFilters,
      managedFilterItemIds: managedFilterItemIds,
      emptyIntent: _context.emptyIntent,
      resetIntent: _context.resetIntent,
      mirrorPatch: _data.cloneJson(_context.mirrorPatch),
      diagnostics: diagnostics,
    };
  }

  /**
   * @param {object|null} _spec
   * @param {object} _diagnostics
   * @param {string|null} _stage failedStage
   * @param {string} _code
   * @param {string} _message
   * @param {{datasource: object, visualization: object}} [_identity] present once the base identity was resolved
   */
  function createPlanFailure(_spec, _diagnostics, _stage, _code, _message, _identity) {
    var spec = _spec || {};
    var identity = _identity || {};
    var diagnostics = _data.cloneJson(_diagnostics);
    diagnostics.failedStage = _stage || diagnostics.failedStage || null;
    return {
      ok: false,
      status: "error",
      errorCode: _code || "WIDGET_BINDING_PLAN_INTERNAL",
      errorMessage: _message || "Binding plan failed.",
      reason: spec.reason == null ? null : String(spec.reason),
      targetKind: spec.targetKind || "vis",
      widgetId: spec.widgetId == null ? null : String(spec.widgetId),
      ownerWidgetId: spec.ownerWidgetId == null ? null : String(spec.ownerWidgetId),
      opSeq: typeof spec.opSeq === "number" ? spec.opSeq : null,
      datasource: identity.datasource || null,
      visualization: identity.visualization || null,
      slotsChanged: false,
      slotsToClear: [],
      slots: [],
      localFilters: [],
      managedFilterItemIds: [],
      emptyIntent: _config.emptyIntentDefault(),
      resetIntent: _config.resetIntentDefault(),
      mirrorPatch: {},
      diagnostics: diagnostics,
    };
  }

  function buildVisResetOnlyPlan(_spec, _base, _emptyIntent, _resetIntent, _diagnostics) {
    return createPlanSuccess({
      reason: _spec.reason,
      targetKind: _spec.targetKind,
      widgetId: _spec.widgetId,
      ownerWidgetId: _spec.ownerWidgetId,
      opSeq: _spec.opSeq,
      datasource: _base.datasource,
      visualization: _base.visualization,
      slots: [],
      localFilters: [],
      managedFilterItemIds: [],
      emptyIntent: _emptyIntent,
      resetIntent: _resetIntent,
      mirrorPatch: {},
      slotsChanged: _planIntent.computeSlotsChanged(_spec.reason, _emptyIntent),
      diagnostics: _diagnostics,
    });
  }

  function resolveActiveTopNValue(_parsedTopN) {
    if (_parsedTopN.kind !== "count") {
      return "default";
    }
    if (_parsedTopN.value) {
      return String(_parsedTopN.value);
    }
    if (typeof _parsedTopN.n === "number") {
      return "top-" + _parsedTopN.n;
    }
    return "top-N";
  }

  function buildMirrorPatch(_spec, _parsedTopN, _filterResult) {
    var dataConfig = _spec.dataConfig || {};
    var dimension = _normalizeDefaultValue(dataConfig.dimension);
    var patch = {
      visualizationType: dataConfig.visualizationType || undefined,
      dimension: dimension || "default",
      datasourceId: dataConfig.datasourceId || undefined,
      datasourceName: dataConfig.datasourceName == null ? null : String(dataConfig.datasourceName),
    };
    if (_parsedTopN.kind === "default" || !dimension) {
      patch.topN = "default";
      return patch;
    }
    patch.topN = resolveActiveTopNValue(_parsedTopN);
    if (_filterResult.topNResultValues) {
      patch.topNResultValues = _filterResult.topNResultValues.slice();
    }
    if (_filterResult.topNExcludeItemId) {
      patch.topNExcludeItemId = _filterResult.topNExcludeItemId;
    }
    return patch;
  }

  return {
    createPlanDiagnostics: createPlanDiagnostics,
    createPlanSuccess: createPlanSuccess,
    createPlanFailure: createPlanFailure,
    buildVisResetOnlyPlan: buildVisResetOnlyPlan,
    buildMirrorPatch: buildMirrorPatch,
  };
});

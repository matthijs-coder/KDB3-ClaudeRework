define([
  "../config/resolveVisualizationBindingConfig.js",
  "./applyPropertyMap.js",
  "./ensureVisType.js",
  "./readVisualizationFacet.js",
  "./applyShowValues.js",
  "./applyIteratorZoom.js",
  "./shouldApplyVisualizationProperties.js"
], function (_resolveVisualizationBindingConfig, _applyPropertyMap, _ensureVisType, _readVisualizationFacet, _applyShowValues, _applyIteratorZoom, _shouldApplyVisualizationProperties) {
  "use strict";

  async function applyVisualizationProperties(_KDB, _options) {
    var options = _options || {};
    var widgetId = options.widgetId;
    var visualizationType = options.visualizationType;
    var runtime = options.runtime || {};
    var input = options.input || {};
    var normalizedVisType = _resolveVisualizationBindingConfig.normalizeVisualizationType(visualizationType)
      || visualizationType;
    var phase = options.phase || "preBinding";
    var visualizationFacet = _readVisualizationFacet(_KDB);
    var diagnostics = {
      phase: phase,
      skipped: false,
      reason: input.reason || null,
      normalizedVisType: normalizedVisType,
      appliedKeys: [],
      failed: [],
      blockers: []
    };
    var propertyValues;
    var layoutPropertyValues;
    var visTypeReady;
    var propertyMapResult;
    var layoutMapResult;

    if (!widgetId) {
      diagnostics.blockers.push("widgetId");
      return { ok: false, skipped: true, diagnostics: diagnostics };
    }
    if (!_shouldApplyVisualizationProperties(input, runtime, normalizedVisType, options)) {
      diagnostics.skipped = true;
      diagnostics.skipReason = "visTypeUnchanged";
      return { ok: true, skipped: true, diagnostics: diagnostics };
    }
    if (!visualizationFacet) {
      diagnostics.blockers.push("cognosHost.visualization");
      return { ok: false, skipped: false, diagnostics: diagnostics };
    }
    if (typeof visualizationFacet.setContentProperty !== "function") {
      diagnostics.blockers.push("visualization.setContentProperty");
      return { ok: false, skipped: false, diagnostics: diagnostics };
    }

    propertyValues = _resolveVisualizationBindingConfig.resolveVisualizationPropertyValues(visualizationType, _KDB);
    if (phase === "postRender" || options.omitTitleMode === true) {
      // titleMode only pre-binding on visible vis; post-render rewrite
      // reopened Cognos title edit (2026-07-13). Helpers must omit it too:
      // customTitle opens note-editable and kills metrics-tree HTML5 drag.
      propertyValues = Object.assign({}, propertyValues);
      delete propertyValues.titleMode;
    }
    layoutPropertyValues = _resolveVisualizationBindingConfig.resolveVisualizationLayoutPropertyValues(visualizationType, _KDB);
    layoutPropertyValues = _applyShowValues.overlayShowValuesOnLayoutMap(layoutPropertyValues, input.settings, normalizedVisType);
    layoutPropertyValues = _applyIteratorZoom.overlayIteratorZoomOnLayoutMap(_KDB, widgetId, layoutPropertyValues, normalizedVisType);

    if (options.signal && options.signal.aborted) {
      return { ok: false, aborted: true, diagnostics: diagnostics };
    }

    try {
      visTypeReady = await _ensureVisType(
        visualizationFacet,
        widgetId,
        _resolveVisualizationBindingConfig.resolveCognosVisualizationTypeId(visualizationType, _KDB),
        diagnostics,
        options.signal
      );
      if (visTypeReady && visTypeReady.aborted === true) {
        return { ok: false, aborted: true, diagnostics: diagnostics };
      }
      if (!visTypeReady || visTypeReady.ok !== true) {
        return { ok: false, diagnostics: diagnostics };
      }
      if (options.signal && options.signal.aborted) {
        return { ok: false, aborted: true, diagnostics: diagnostics };
      }
      propertyMapResult = await _applyPropertyMap(
        visualizationFacet.setContentProperty.bind(visualizationFacet),
        widgetId,
        propertyValues,
        diagnostics,
        "propertyValues",
        options.signal
      );
      if (propertyMapResult && propertyMapResult.aborted === true) {
        return { ok: false, aborted: true, diagnostics: diagnostics };
      }
      layoutMapResult = await _applyPropertyMap(
        visualizationFacet.setContentProperty.bind(visualizationFacet),
        widgetId,
        layoutPropertyValues,
        diagnostics,
        "layoutPropertyValues",
        options.signal
      );
      if (layoutMapResult && layoutMapResult.aborted === true) {
        return { ok: false, aborted: true, diagnostics: diagnostics };
      }
      if (propertyMapResult.ok && layoutMapResult.ok) {
        runtime.lastAppliedVisPropertiesType = normalizedVisType;
      }
      return {
        ok: !!(propertyMapResult.ok && layoutMapResult.ok),
        skipped: false,
        diagnostics: diagnostics
      };
    } catch (err) {
      console.error("[widgetVis.applyVisualizationProperties] failed", widgetId, err);
      diagnostics.failed.push({
        group: "ensureVisType",
        key: null,
        errorMessage: String(err && err.message ? err.message : err)
      });
      return { ok: false, diagnostics: diagnostics };
    }
  }

  return applyVisualizationProperties;
});

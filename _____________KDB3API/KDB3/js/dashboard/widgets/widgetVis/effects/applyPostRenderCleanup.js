define([
  "./syncVisualizationTitle.js",
  "../view/sweepLegendCaptions.js",
  "../view/syncTooltipMetadata.js",
  "../view/resolveQueryRoot.js",
  "./installAllDrillthrough.js",
  "./installCanvasMaximize.js"
], function (_syncVisualizationTitle, _sweepLegendCaptions, _syncTooltipMetadata, _resolveQueryRoot, _installDrillthrough, _installCanvasMaximize) {
  "use strict";

  function readDerivedRecord(_KDB, _widgetId) {
    var visState = _KDB && _KDB.state && _KDB.state.widgets && _KDB.state.widgets.vis;
    var record = visState && visState.byId ? visState.byId[_widgetId] : null;
    return record && record.derived ? record.derived : {};
  }

  function applyPostRenderCleanup(_options) {
    var options = _options || {};
    var widgetId = options.widgetId;
    var opSeq = options.opSeq;
    var diagnostics = { title: null, legend: null, tooltip: null, drillthrough: null, maximize: null, stale: false };
    if (typeof options.isStaleOpSeq === "function" && options.isStaleOpSeq(widgetId, opSeq)) {
      diagnostics.stale = true;
      return { ok: false, stale: true, titleText: "", diagnostics: diagnostics };
    }
    var runtime = options.runtime || {};
    var input = options.input || {};
    var helperTableResult = input.helperTableResult || null;
    var titleResult = { ok: false, titleText: "", diagnostics: {} };
    try {
      titleResult = _syncVisualizationTitle.syncVisualizationTitle({
        _KDB: options._KDB,
        widgetId: widgetId,
        metric: input.metric || {},
        settings: input.settings || {},
        helperTableResult: helperTableResult,
        derived: readDerivedRecord(options._KDB, widgetId),
        runtime: runtime
      });
      diagnostics.title = titleResult.diagnostics || null;
    } catch (err) {
      console.error("[widgetVis.applyPostRenderCleanup] title sync failed", widgetId, err);
      diagnostics.title = { error: String(err && err.message ? err.message : err) };
    }
    try {
      var settings = input.settings || {};
      diagnostics.legend = _sweepLegendCaptions(runtime, widgetId, {
        widgetId: widgetId,
        opSeq: opSeq,
        reason: options.plan && options.plan.reason ? options.plan.reason : null,
        dimension: settings.dimension != null ? settings.dimension : null,
        visType: settings.visType != null ? settings.visType : null,
        runtime: runtime,
        isStaleOpSeq: options.isStaleOpSeq
      });
    } catch (err) {
      console.error("[widgetVis.applyPostRenderCleanup] legend sync failed", widgetId, err);
      diagnostics.legend = { error: String(err && err.message ? err.message : err) };
    }
    try {
      diagnostics.tooltip = _syncTooltipMetadata(_resolveQueryRoot(runtime, widgetId));
    } catch (err) {
      console.error("[widgetVis.applyPostRenderCleanup] tooltip sync failed", widgetId, err);
      diagnostics.tooltip = { error: String(err && err.message ? err.message : err) };
    }
    try {
      diagnostics.drillthrough = _installDrillthrough({ _KDB: options._KDB, widgetId: widgetId });
    } catch (err) {
      console.error("[widgetVis.applyPostRenderCleanup] drillthrough install failed", widgetId, err);
      diagnostics.drillthrough = { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
    try {
      diagnostics.maximize = _installCanvasMaximize({ _KDB: options._KDB, widgetId: widgetId });
    } catch (err) {
      console.error("[widgetVis.applyPostRenderCleanup] maximize install failed", widgetId, err);
      diagnostics.maximize = { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" };
    }
    // Top-level ok reflects title sync only; legend/tooltip outcomes live in diagnostics.
    return {
      ok: titleResult.ok !== false,
      titleText: titleResult.titleText || "",
      diagnostics: diagnostics
    };
  }

  return applyPostRenderCleanup;
});

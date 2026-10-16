define([
  "../view/sweepLegendCaptions.js",
  "../view/syncLegendVisibility.js",
  "../view/resolveLegendQueryRoot.js",
  "../view/legend/installLegendTextObserver.js"
], function (_sweepLegendCaptions, _syncLegendVisibility, _resolveLegendQueryRoot, _installLegendTextObserver) {
  "use strict";

  function installLegendObserverBeforeApply(_runtime, _widgetId, _options) {
    var options = _options || {};
    try {
      var legendRoot = _resolveLegendQueryRoot(_runtime, _widgetId);
      if (!legendRoot.queryRoot) {
        return {
          action: "skipped",
          reason: legendRoot.skipReason || "no_query_root"
        };
      }
      return _installLegendTextObserver(legendRoot.queryRoot, {
        widgetId: _widgetId,
        opSeq: options.opSeq,
        reason: "preApplyBinding",
        dimension: options.dimension != null ? options.dimension : null,
        visType: options.visType != null ? options.visType : null,
        runtime: _runtime,
        isStaleOpSeq: options.isStaleOpSeq,
        skipReason: legendRoot.skipReason,
        isShell: legendRoot.isShell === true
      });
    } catch (err) {
      console.error("[widgetVis.installLegendObserverBeforeApply] failed", _widgetId, err);
      return { action: "failed", error: String(err && err.message ? err.message : err) };
    }
  }

  return {
    sweepLegendCaptions: _sweepLegendCaptions,
    installLegendObserverBeforeApply: installLegendObserverBeforeApply,
    disconnectLegendTextObserver: _syncLegendVisibility.disconnectLegendTextObserver
  };
});

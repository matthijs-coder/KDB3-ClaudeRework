define([
  "./legend/runLegendSanitizers.js",
  "./legend/installLegendTextObserver.js"
], function (_runLegendSanitizers, _installLegendTextObserver) {
  "use strict";

  function syncLegendVisibility(_queryRoot, _context) {
    try {
      var context = _context || {};
      var diagnostics = _runLegendSanitizers(_queryRoot, context, { fromObserver: false });
      if (context.installObserver === false) {
        diagnostics.observer = { action: "skipped", reason: "install_observer_false" };
        return diagnostics;
      }
      if (context.runtime) {
        try {
          diagnostics.observer = _installLegendTextObserver(_queryRoot, context);
        } catch (err) {
          console.error("[widgetVis.syncLegendVisibility] observer install failed", err);
          diagnostics.observer = {
            action: "failed",
            error: String(err && err.message ? err.message : err)
          };
        }
      }
      return diagnostics;
    } catch (err) {
      console.error("[widgetVis.syncLegendVisibility] failed", err);
      return { error: String(err && err.message ? err.message : err) };
    }
  }

  syncLegendVisibility.disconnectLegendTextObserver =
    _installLegendTextObserver.disconnectLegendTextObserver;
  syncLegendVisibility.runLegendSanitizers = _runLegendSanitizers;
  syncLegendVisibility.installLegendTextObserver = _installLegendTextObserver;

  return syncLegendVisibility;
});

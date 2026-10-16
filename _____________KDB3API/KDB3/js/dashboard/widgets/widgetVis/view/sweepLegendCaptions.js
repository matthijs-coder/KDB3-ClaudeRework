define([
  "./resolveLegendQueryRoot.js",
  "./syncLegendVisibility.js"
], function (_resolveLegendQueryRoot, _syncLegendVisibility) {
  "use strict";

  function sweepLegendCaptions(_runtime, _widgetId, _context) {
    try {
      var legendRoot = _resolveLegendQueryRoot(_runtime, _widgetId);
      if (!legendRoot.queryRoot) {
        var skipReason = legendRoot.skipReason || "no_query_root";
        return {
          skipped: skipReason,
          observer: { action: "skipped", reason: skipReason }
        };
      }
      var context = Object.assign({}, _context || {}, {
        isShell: legendRoot.isShell === true
      });
      return _syncLegendVisibility(legendRoot.queryRoot, context);
    } catch (err) {
      console.error("[widgetVis.sweepLegendCaptions] failed", _widgetId, err);
      return { error: String(err && err.message ? err.message : err) };
    }
  }

  return sweepLegendCaptions;
});

define([
  "./focusMode/domQueries.js",
  "./installAllDrillthrough.js"
], function (_domQueries, _installAllDrillthrough) {
  "use strict";

  function __controller(_options) {
    var options = _options || {};
    var widgetId = options.widgetId;
    try {
      if (_domQueries.isWidgetExpanded(widgetId)) {
        return { ok: true, skipped: true, reason: "still_expanded" };
      }
      return _installAllDrillthrough(options);
    } catch (err) {
      console.error("[widgetVis.syncDrillthroughAfterFocusExit]", widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  return __controller;
});

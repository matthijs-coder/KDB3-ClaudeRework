define([
  "../runtime.js",
  "../view/placeCanvasMaximizeIcon.js",
  "./bindCanvasMaximizeIconClick.js"
], function (_visRuntime, _placeCanvasMaximizeIcon, _bindCanvasMaximizeIconClick) {
  "use strict";

  function __controller(_options) {
    try {
      var options = _options || {};
      var _KDB = options._KDB;
      var widgetId = options.widgetId;
      var runtime;
      var placed;
      runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
      placed = _placeCanvasMaximizeIcon({ widgetId: widgetId });
      if (!placed || placed.ok !== true) {
        return placed || {
          ok: false,
          errorCode: "WIDGET_VIS_MAXIMIZE_FAILED",
          errorMessage: "maximize icon plant failed"
        };
      }
      if (placed.skipped) {
        return placed;
      }
      _bindCanvasMaximizeIconClick({
        _KDB: _KDB,
        widgetId: widgetId,
        iconEl: placed.wrapperEl,
        runtime: runtime
      });
      runtime.domRefs = runtime.domRefs || {};
      runtime.domRefs.canvasMaximizeIconEl = placed.wrapperEl;
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.installCanvasMaximize]", options && options.widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" };
    }
  }

  return __controller;
});

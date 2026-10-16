define([
  "./installCanvasMaximize.js"
], function (_installCanvasMaximize) {
  "use strict";

  function retryCanvasMaximize(_ctx) {
    try {
      if (!_ctx || !_ctx.widgetId) {
        return { ok: true, skipped: true, reason: "missing ctx" };
      }
      return _installCanvasMaximize({
        _KDB: _ctx._KDB,
        widgetId: _ctx.widgetId
      });
    } catch (err) {
      console.error("[widgetVis.retryCanvasMaximize]", _ctx && _ctx.widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" };
    }
  }

  return retryCanvasMaximize;
});

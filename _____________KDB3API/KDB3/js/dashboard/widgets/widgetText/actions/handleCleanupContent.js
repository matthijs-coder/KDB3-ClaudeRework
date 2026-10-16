define([
  "../config/actionTypes.js",
  "../effects/cleanupWidgetTextRuntime.js"
], function (_actionTypes, _cleanupWidgetTextRuntime) {
  function __controller(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var reason = payload.reason || "remove";
      _cleanupWidgetTextRuntime(_context._KDB, widgetId);
      _context.dispatchInternal({
        type: _actionTypes.CLEANUP_CONTENT_SUCCEEDED,
        widgetId: widgetId,
        payload: { reason: reason }
      });
      return Promise.resolve({ ok: true, widgetId: widgetId, opSeq: _action.opSeq, status: "success" });
    } catch (err) {
      console.error("[widgetText.handleCleanupContent] failed", err);
      return Promise.resolve({
        ok: false,
        widgetId: _action.widgetId,
        opSeq: _action.opSeq,
        status: "error",
        errorCode: "WIDGET_TEXT_CLEANUP_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      });
    }
  }
  return __controller;
});

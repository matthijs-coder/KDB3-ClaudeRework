define([
  "../effects/manageScopedTextColorStyle.js"
], function (_manageScopedTextColorStyle) {
  function __controller(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
      var textColor = payload.textColor != null ? String(payload.textColor) : "";
      if (!textColor) {
        return Promise.resolve(result(false, widgetId, opSeq, "WIDGET_TEXT_COLOR_VALUE_MISSING"));
      }
      var applyResult = _manageScopedTextColorStyle.applyReadableTextColor(_context._KDB, widgetId, textColor);
      return Promise.resolve(applyResult.ok === true
        ? result(true, widgetId, opSeq)
        : result(false, widgetId, opSeq, applyResult.errorCode || "WIDGET_TEXT_COLOR_APPLY_FAILED", applyResult.errorMessage));
    } catch (err) {
      console.error("[widgetText.handleApplyReadableTextColor] failed", err);
      return Promise.resolve(result(false, _action.widgetId, _action.opSeq, "WIDGET_TEXT_COLOR_APPLY_FAILED", err));
    }
  }

  function result(ok, widgetId, opSeq, errorCode, error) {
    return {
      ok: ok,
      widgetId: widgetId,
      opSeq: opSeq,
      status: ok ? "success" : "error",
      errorCode: errorCode,
      errorMessage: error ? String(error.message || error) : undefined
    };
  }

  return __controller;
});

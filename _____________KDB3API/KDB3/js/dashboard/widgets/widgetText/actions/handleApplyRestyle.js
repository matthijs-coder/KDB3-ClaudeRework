define([
  "../config/actionTypes.js",
  "../view/resolveWidgetTextShell.js",
  "../view/applyTextRestyle.js"
], function (_actionTypes, _resolveWidgetTextShell, _applyTextRestyle) {
  function __controller(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
      _context.dispatchInternal({
        type: _actionTypes.MARK_PENDING,
        widgetId: widgetId,
        payload: { kind: "restyle", opSeq: opSeq }
      });
      var shellEl = _resolveWidgetTextShell(_context._KDB, widgetId);
      if (!shellEl) {
        recordError(_context, widgetId, "WIDGET_TEXT_RESTYLE_TARGET_MISSING");
        return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_RESTYLE_TARGET_MISSING"));
      }
      var requested = payload.nextValue != null ? payload.nextValue
        : payload.optionValue != null ? payload.optionValue
          : payload.optionKey;
      var applyResult = _applyTextRestyle(_context._KDB, widgetId, shellEl, requested);
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return Promise.resolve({ ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" });
      }
      if (!applyResult.ok) {
        recordError(_context, widgetId, applyResult.errorCode || "WIDGET_TEXT_RESTYLE_APPLY_FAILED", applyResult.errorMessage);
        return Promise.resolve(failureResult(widgetId, opSeq, applyResult.errorCode, applyResult.errorMessage));
      }
      _context.dispatchInternal({
        type: _actionTypes.CLEAR_PENDING,
        widgetId: widgetId,
        payload: { opSeq: opSeq }
      });
      return Promise.resolve({
        ok: true,
        widgetId: widgetId,
        opSeq: opSeq,
        status: "success",
        reportToSettings: {
          control: "restyle",
          kind: "layout",
          previousValue: payload.previousValue != null ? payload.previousValue : null,
          nextValue: applyResult.settingsValue,
          appliedClass: applyResult.appliedClass,
          diagnostics: applyResult.diagnostics
        }
      });
    } catch (err) {
      console.error("[widgetText.handleApplyRestyle] failed", err);
      return Promise.resolve(failureResult(_action.widgetId, _action.opSeq, "WIDGET_TEXT_RESTYLE_APPLY_FAILED", err));
    }
  }

  function recordError(_context, _widgetId, _errorCode, _errorMessage) {
    _context.dispatchInternal({
      type: _actionTypes.ERROR_RECORDED,
      widgetId: _widgetId,
      payload: { errorCode: _errorCode, errorMessage: _errorMessage || null }
    });
  }

  function failureResult(_widgetId, _opSeq, _errorCode, _errorMessage) {
    return {
      ok: false,
      widgetId: _widgetId,
      opSeq: _opSeq,
      status: "error",
      errorCode: _errorCode,
      errorMessage: _errorMessage ? String(_errorMessage) : undefined
    };
  }

  return __controller;
});

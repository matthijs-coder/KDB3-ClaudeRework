define([
  "../config/actionTypes.js",
  "../view/resolveWidgetTextShell.js",
  "../view/resolveTextEditableNodes.js",
  "../effects/applyTextFontSize.js"
], function (_actionTypes, _resolveWidgetTextShell, _resolveTextEditableNodes, _applyTextFontSize) {
  function __controller(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
      _context.dispatchInternal({
        type: _actionTypes.MARK_PENDING,
        widgetId: widgetId,
        payload: { kind: "fontSize", opSeq: opSeq }
      });
      var shellEl = _resolveWidgetTextShell(_context._KDB, widgetId);
      if (!shellEl) {
        recordError(_context, widgetId, "WIDGET_TEXT_SHELL_MISSING");
        return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_SHELL_MISSING"));
      }
      var nodes = _resolveTextEditableNodes(_context._KDB, widgetId, shellEl);
      if (!nodes || !nodes.textNodeForFont) {
        recordError(_context, widgetId, "WIDGET_TEXT_FONT_TARGET_MISSING");
        return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_FONT_TARGET_MISSING"));
      }
      var requested = payload.nextValue != null ? payload.nextValue
        : payload.optionValue != null ? payload.optionValue
          : payload.optionKey;
      return Promise.resolve(_applyTextFontSize(_context._KDB, widgetId, nodes, requested, _context.options)).then(function (applyResult) {
        if (_context.isStaleOpSeq(widgetId, opSeq)) {
          return { ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" };
        }
        if (!applyResult.ok) {
          recordError(_context, widgetId, applyResult.errorCode || "WIDGET_TEXT_FONT_APPLY_FAILED", applyResult.errorMessage);
          return failureResult(widgetId, opSeq, applyResult.errorCode, applyResult.errorMessage);
        }
        _context.dispatchInternal({
          type: _actionTypes.CLEAR_PENDING,
          widgetId: widgetId,
          payload: { opSeq: opSeq }
        });
        return {
          ok: true,
          widgetId: widgetId,
          opSeq: opSeq,
          status: "success",
          reportToSettings: {
            control: "fontSize",
            kind: "fontSize",
            previousValue: payload.previousValue != null ? payload.previousValue : null,
            nextValue: applyResult.settingsValue,
            appliedValue: applyResult.appliedValue,
            diagnostics: applyResult.diagnostics
          }
        };
      });
    } catch (err) {
      console.error("[widgetText.handleApplyFontSize] failed", err);
      return Promise.resolve(failureResult(_action.widgetId, _action.opSeq, "WIDGET_TEXT_FONT_APPLY_FAILED", err));
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

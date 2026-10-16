define([
  "../view/resolveWidgetTextShell.js",
  "../view/resolveTextEditableNodes.js",
  "./commitConfirmedText.js",
  "./startInlineTextEdit.js"
], function (
  _resolveWidgetTextShell,
  _resolveTextEditableNodes,
  _commitConfirmedText,
  _startInlineTextEdit
) {
  function __controller(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
      var shellEl = _resolveWidgetTextShell(_context._KDB, widgetId);
      if (!shellEl) {
        return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_SHELL_MISSING"));
      }
      var nodes = _resolveTextEditableNodes(_context._KDB, widgetId, shellEl);
      if (!nodes || !nodes.editableEl) {
        return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_EDITABLE_MISSING"));
      }
      _commitConfirmedText.storeDomRefs(_context._KDB, widgetId, nodes);
      if (payload.nextText != null) {
        return Promise.resolve(_commitConfirmedText.commitConfirmedText(_context, widgetId, nodes, opSeq, payload));
      }
      return Promise.resolve(_startInlineTextEdit(_context, widgetId, nodes, opSeq, payload));
    } catch (err) {
      console.error("[widgetText.handleCommitTextEdit] failed", err);
      return Promise.resolve(failureResult(_action.widgetId, _action.opSeq, "WIDGET_TEXT_EDIT_COMMIT_FAILED", err));
    }
  }

  function failureResult(_widgetId, _opSeq, _errorCode, _err) {
    return {
      ok: false,
      widgetId: _widgetId,
      opSeq: _opSeq,
      status: "error",
      errorCode: _errorCode,
      errorMessage: _err ? String(_err.message || _err) : undefined
    };
  }

  return __controller;
});

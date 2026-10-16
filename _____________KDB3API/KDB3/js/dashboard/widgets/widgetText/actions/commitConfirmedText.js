define([
  "../config/actionTypes.js",
  "../config/defaults.js",
  "../runtime/ensureWidgetRuntime.js",
  "../view/resolveTextEditableNodes.js",
  "../view/syncTextContentDom.js",
  "../effects/applyTextFontSize.js",
  "../effects/commitWidgetTextHistory.js"
], function (
  _actionTypes,
  _defaults,
  _ensureWidgetRuntime,
  _resolveTextEditableNodes,
  _syncTextContentDom,
  _applyTextFontSize,
  _commitWidgetTextHistory
) {
  function __controller(_context, _widgetId, _nodes, _opSeq, _payload) {
    if (_context.isStaleOpSeq(_widgetId, _opSeq)) {
      return { ok: false, widgetId: _widgetId, opSeq: _opSeq, stale: true, status: "aborted" };
    }
    endEditDom(_context._KDB, _widgetId, _nodes, false);
    _nodes = _resolveTextEditableNodes(_context._KDB, _widgetId, _nodes.shellEl);
    storeDomRefs(_context._KDB, _widgetId, _nodes);
    var previousText = _payload.previousText != null
      ? String(_payload.previousText)
      : readCurrentText(_context, _widgetId, _nodes);
    var nextText = _payload.nextText != null ? String(_payload.nextText) : previousText;
    if (_payload.isHistoryReplay !== true && previousText === nextText) {
      return { ok: true, widgetId: _widgetId, opSeq: _opSeq, skipped: true, reasonCode: "WIDGET_TEXT_UNCHANGED" };
    }
    _syncTextContentDom(_nodes, nextText);
    _context.dispatchInternal({
      type: _actionTypes.COMMIT_TEXT_CONTENT,
      widgetId: _widgetId,
      payload: { text: nextText }
    });
    var historyResult = _commitWidgetTextHistory(_context._KDB, _widgetId, previousText, nextText, {
      isHistoryReplay: _payload.isHistoryReplay === true
    });
    if (!historyResult.ok && _payload.isHistoryReplay !== true) {
      return failureResult(_widgetId, _opSeq, historyResult.errorCode || "WIDGET_TEXT_HISTORY_COMMIT_FAILED", historyResult.errorMessage);
    }
    return Promise.resolve(maybeRefitFont(_context, _widgetId, _nodes)).then(function () {
      return { ok: true, widgetId: _widgetId, opSeq: _opSeq, status: "success" };
    });
  }

  function readCurrentText(_context, _widgetId, _nodes) {
    var fromState = _context.selectors.readTextContent(_context._KDB, _widgetId);
    if (fromState != null) {
      return String(fromState);
    }
    var target = _nodes.paragraphEl || _nodes.editableEl;
    return target ? String(target.textContent || "") : "";
  }

  function maybeRefitFont(_context, _widgetId, _nodes) {
    var runtime = _ensureWidgetRuntime(_context._KDB, _widgetId);
    var currentFontSize = runtime.fontSize || _defaults.automaticFontSize;
    if (currentFontSize === _defaults.automaticFontSize) {
      return _applyTextFontSize(_context._KDB, _widgetId, _nodes, _defaults.automaticFontSize, _context.options);
    }
    return undefined;
  }

  function cancelInlineTextEdit(_context, _widgetId, _nodes, _opSeq) {
    if (_context.isStaleOpSeq(_widgetId, _opSeq)) {
      return { ok: false, widgetId: _widgetId, opSeq: _opSeq, stale: true, status: "aborted" };
    }
    endEditDom(_context._KDB, _widgetId, _nodes, true);
    return {
      ok: true,
      widgetId: _widgetId,
      opSeq: _opSeq,
      skipped: true,
      reasonCode: "WIDGET_TEXT_EDIT_CANCELLED"
    };
  }

  function endEditDom(_KDB, _widgetId, _nodes, _restoreOriginal) {
    var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
    if (_nodes.editableEl) {
      _nodes.editableEl.contentEditable = "false";
      _nodes.editableEl.removeAttribute(_defaults.editActiveAttr);
    }
    if (_restoreOriginal && runtime.editSession && runtime.editSession.originalText != null) {
      _syncTextContentDom(_nodes, runtime.editSession.originalText);
    }
    runtime.editSession = { isActive: false, originalText: null, startedAt: null };
  }

  function storeDomRefs(_KDB, _widgetId, _nodes) {
    var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
    runtime.domRefs = {
      shellEl: _nodes.shellEl,
      contentEl: _nodes.contentEl,
      editableEl: _nodes.editableEl,
      paragraphEl: _nodes.paragraphEl,
      spanEl: _nodes.spanEl,
      textNodeForFont: _nodes.textNodeForFont
    };
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

  return {
    commitConfirmedText: __controller,
    cancelInlineTextEdit: cancelInlineTextEdit,
    endEditDom: endEditDom,
    storeDomRefs: storeDomRefs
  };
});

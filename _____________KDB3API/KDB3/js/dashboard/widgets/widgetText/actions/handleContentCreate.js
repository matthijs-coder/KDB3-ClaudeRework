define([
  "../config/actionTypes.js",
  "../config/defaults.js",
  "../view/resolveWidgetTextShell.js",
  "../view/resolveTextEditableNodes.js",
  "../view/buildTextContentDom.js",
  "../view/placeTextContentDom.js",
  "../view/syncTextContentDom.js",
  "./commitConfirmedText.js"
], function (
  _actionTypes,
  _defaults,
  _resolveWidgetTextShell,
  _resolveTextEditableNodes,
  _buildTextContentDom,
  _placeTextContentDom,
  _syncTextContentDom,
  _commitConfirmedText
) {
  function __controller(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
      var shellEl = _resolveWidgetTextShell(_context._KDB, widgetId);
      if (!shellEl) {
        recordError(_context, widgetId, "WIDGET_TEXT_SHELL_MISSING");
        return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_SHELL_MISSING"));
      }
      var nodes = _resolveTextEditableNodes(_context._KDB, widgetId, shellEl);
      var initialText;
      if (!nodes || !nodes.editableEl) {
        initialText = resolveInitialText(_context, payload);
        var built = _buildTextContentDom(initialText);
        if (!built) {
          recordError(_context, widgetId, "WIDGET_TEXT_CONTENT_CREATE_FAILED");
          return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_CONTENT_CREATE_FAILED"));
        }
        nodes = _placeTextContentDom(_context._KDB, widgetId, shellEl, built);
        if (!nodes || !nodes.editableEl) {
          recordError(_context, widgetId, "WIDGET_TEXT_EDITABLE_MISSING");
          return Promise.resolve(failureResult(widgetId, opSeq, "WIDGET_TEXT_EDITABLE_MISSING"));
        }
      }
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return Promise.resolve({ ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" });
      }
      if (initialText === undefined) {
        initialText = resolveInitialText(_context, payload);
      }
      var textValue = _syncTextContentDom(nodes, initialText);
      _commitConfirmedText.storeDomRefs(_context._KDB, widgetId, nodes);
      _context.dispatchInternal({
        type: _actionTypes.REGISTER_CONTENT,
        widgetId: widgetId,
        payload: { text: textValue }
      });
      _context.dispatchInternal({
        type: _actionTypes.CLEAR_PENDING,
        widgetId: widgetId,
        payload: { opSeq: opSeq }
      });
      return Promise.resolve({ ok: true, widgetId: widgetId, opSeq: opSeq, status: "success" });
    } catch (err) {
      console.error("[widgetText.handleContentCreate] failed", err);
      recordError(_context, _action.widgetId, "WIDGET_TEXT_CONTENT_CREATE_FAILED", err);
      return Promise.resolve(failureResult(_action.widgetId, _action.opSeq, "WIDGET_TEXT_CONTENT_CREATE_FAILED", err));
    }
  }

  function recordError(_context, _widgetId, _errorCode, _err) {
    _context.dispatchInternal({
      type: _actionTypes.ERROR_RECORDED,
      widgetId: _widgetId,
      payload: {
        errorCode: _errorCode,
        errorMessage: _err ? String(_err.message || _err) : undefined
      }
    });
  }

  function resolveInitialText(_context, _payload) {
    var dropRequest = _payload.dropRequest || {};
    var dropPayload = dropRequest.payload || {};
    if (dropPayload.text != null && String(dropPayload.text).length) {
      return String(dropPayload.text);
    }
    if (dropPayload.title != null && String(dropPayload.title).length) {
      return String(dropPayload.title);
    }
    if (dropPayload.defaultText != null) {
      return String(dropPayload.defaultText);
    }
    if (_payload.defaultText != null) {
      return String(_payload.defaultText);
    }
    if (_context.options && _context.options.defaultText != null) {
      return String(_context.options.defaultText);
    }
    return _defaults.defaultText;
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

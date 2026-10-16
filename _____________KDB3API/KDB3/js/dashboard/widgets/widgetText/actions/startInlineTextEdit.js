define([
  "../config/defaults.js",
  "../runtime/ensureWidgetRuntime.js",
  "../view/resolveTextEditableNodes.js",
  "../effects/bindInlineTextEdit.js",
  "./commitConfirmedText.js"
], function (
  _defaults,
  _ensureWidgetRuntime,
  _resolveTextEditableNodes,
  _bindInlineTextEdit,
  _commitConfirmedText
) {
  function __controller(_context, _widgetId, _nodes, _opSeq, _payload) {
    try {
      var runtime = _ensureWidgetRuntime(_context._KDB, _widgetId);
      if (runtime.editSession && runtime.editSession.isActive) {
        abortActiveEdit(_context._KDB, _widgetId, _nodes);
        _nodes = _resolveTextEditableNodes(_context._KDB, _widgetId, _nodes.shellEl);
        _commitConfirmedText.storeDomRefs(_context._KDB, _widgetId, _nodes);
      }
      var previousText = readCurrentText(_context, _widgetId, _nodes);
      runtime.editSession = {
        isActive: true,
        originalText: previousText,
        startedAt: Date.now()
      };
      _nodes.editableEl.contentEditable = "true";
      _nodes.editableEl.setAttribute(_defaults.editActiveAttr, "1");
      var bindOptions = Object.assign({}, _context.options, {
        commitOnBlur: _payload.commitOnBlur !== false
      });
      focusEditableText(_nodes.editableEl);
      if (_payload.selectText !== false) {
        selectEditableText(_nodes);
      }
      var bindResult = _bindInlineTextEdit(_context._KDB, _widgetId, _nodes, {
        onConfirm: function (nextText) {
          _commitConfirmedText.commitConfirmedText(_context, _widgetId, _nodes, _opSeq, {
            nextText: nextText,
            previousText: previousText,
            isHistoryReplay: _payload.isHistoryReplay,
            source: _payload.source
          });
        },
        onCancel: function () {
          _commitConfirmedText.cancelInlineTextEdit(_context, _widgetId, _nodes, _opSeq);
        }
      }, bindOptions);
      if (!bindResult.ok) {
        _commitConfirmedText.endEditDom(_context._KDB, _widgetId, _nodes, true);
        return {
          ok: false,
          widgetId: _widgetId,
          opSeq: _opSeq,
          status: "error",
          errorCode: bindResult.errorCode || "WIDGET_TEXT_EDIT_START_FAILED",
          errorMessage: bindResult.errorMessage
        };
      }
      return { ok: true, widgetId: _widgetId, opSeq: _opSeq, status: "success" };
    } catch (err) {
      console.error("[widgetText.startInlineTextEdit] failed", { widgetId: _widgetId }, err);
      _commitConfirmedText.endEditDom(_context._KDB, _widgetId, _nodes, true);
      return {
        ok: false,
        widgetId: _widgetId,
        opSeq: _opSeq,
        status: "error",
        errorCode: "WIDGET_TEXT_EDIT_START_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
  }

  function readCurrentText(_context, _widgetId, _nodes) {
    var target = _nodes.paragraphEl || _nodes.editableEl;
    if (target) {
      return String(target.textContent || "");
    }
    var fromState = _context.selectors.readTextContent(_context._KDB, _widgetId);
    if (fromState != null) {
      return String(fromState);
    }
    return "";
  }

  function abortActiveEdit(_KDB, _widgetId, _nodes) {
    var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
    if (runtime.abortControllers && runtime.abortControllers.edit) {
      runtime.abortControllers.edit.abort();
      delete runtime.abortControllers.edit;
    }
    _commitConfirmedText.endEditDom(_KDB, _widgetId, _nodes, true);
  }

  function focusEditableText(_editableEl) {
    if (!_editableEl || typeof _editableEl.focus !== "function") {
      return;
    }
    _editableEl.focus();
  }

  function selectEditableText(_nodes) {
    var target = _nodes.paragraphEl || _nodes.editableEl;
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return __controller;
});

define([
  "../runtime/ensureWidgetRuntime.js"
], function (_ensureWidgetRuntime) {
  function __controller(_KDB, _widgetId, _nodes, _callbacks, _options) {
    try {
      if (!_nodes || !_nodes.editableEl) {
        return { ok: false, errorCode: "WIDGET_TEXT_EDITABLE_MISSING" };
      }
      abortEditController(_KDB, _widgetId);
      var controller = new AbortController();
      var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
      runtime.abortControllers.edit = controller;
      var editableEl = _nodes.editableEl;
      var onKeyDown = onKeyDownHandler.bind(null, _KDB, _widgetId, _callbacks, controller);
      var onFocusOut = onFocusOutHandler.bind(null, _nodes, _callbacks, controller, _options);
      window.setTimeout(armInlineTextEditListeners, 0, editableEl, onKeyDown, onFocusOut, controller);
      runtime.listeners.editKeyDown = onKeyDown;
      runtime.listeners.editFocusOut = onFocusOut;
      return { ok: true };
    } catch (err) {
      console.error("[widgetText.bindInlineTextEdit] failed", { widgetId: _widgetId }, err);
      return { ok: false, errorCode: "WIDGET_TEXT_EDIT_START_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function armInlineTextEditListeners(_editableEl, _onKeyDown, _onFocusOut, _controller) {
    try {
      if (_controller.signal.aborted) {
        return;
      }
      _editableEl.addEventListener("keydown", _onKeyDown, { signal: _controller.signal });
      _editableEl.addEventListener("focusout", _onFocusOut, { signal: _controller.signal });
    } catch (err) {
      console.error("[widgetText.armInlineTextEditListeners] failed", err);
    }
  }

  function abortEditController(_KDB, _widgetId) {
    var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
    if (runtime.abortControllers && runtime.abortControllers.edit) {
      runtime.abortControllers.edit.abort();
      delete runtime.abortControllers.edit;
    }
    delete runtime.listeners.editKeyDown;
    delete runtime.listeners.editFocusOut;
  }

  function onFocusOutHandler(_nodes, _callbacks, _controller, _options, _event) {
    try {
      if (_controller.signal.aborted || (_options && _options.commitOnBlur === false)) {
        return;
      }
      var relatedTarget = _event && _event.relatedTarget ? _event.relatedTarget : null;
      if (relatedTarget && _nodes.editableEl && _nodes.editableEl.contains(relatedTarget)) {
        return;
      }
      confirmCurrentText(_nodes, _callbacks, _controller);
    } catch (err) {
      console.error("[widgetText.bindInlineTextEdit.onFocusOut] failed", err);
      throw err;
    }
  }

  function confirmCurrentText(_nodes, _callbacks, _controller) {
    var target;
    var paragraph;
    var nextText;
    if (_controller.signal.aborted) {
      return;
    }
    _controller.abort();
    target = _nodes.editableEl;
    paragraph = target.querySelector("p");
    nextText = paragraph ? paragraph.textContent : target.textContent;
    if (_callbacks && typeof _callbacks.onConfirm === "function") {
      _callbacks.onConfirm(nextText != null ? String(nextText) : "");
    }
  }

  function onKeyDownHandler(_KDB, _widgetId, _callbacks, _controller, _event) {
    try {
      if (_controller.signal.aborted) {
        return;
      }
      if (_event.key === "Escape") {
        _event.preventDefault();
        abortEditController(_KDB, _widgetId);
        if (_callbacks && typeof _callbacks.onCancel === "function") {
          _callbacks.onCancel();
        }
      }
    } catch (err) {
      console.error("[widgetText.bindInlineTextEdit.onKeyDown] failed", err);
      throw err;
    }
  }

  return __controller;
});

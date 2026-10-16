define([
  "./config.js",
  "./config/actionTypes.js",
  "./dispatchResult.js",
  "./fontSize.js",
  "./textEdit.js",
  "./textStyle.js",
  "./view.js",
  "./widgetRuntime.js",
  "../../../core/utils/kit/runtime.js"
], function (_config, _actionTypes, _dispatchResult, _fontSize, _textEdit, _textStyle, _view, _widgetRuntime, _rt) {
  "use strict";

  function readRequestedValue(_payload) {
    if (_payload.nextValue != null) {
      return _payload.nextValue;
    }
    return _payload.optionValue != null ? _payload.optionValue : _payload.optionKey;
  }

  function failAndRecord(_context, _widgetId, _opSeq, _errorCode, _err) {
    _context.dispatchInternal({
      type: _actionTypes.ERROR_RECORDED,
      widgetId: _widgetId,
      payload: { errorCode: _errorCode, errorMessage: _err ? String(_err.message || _err) : undefined }
    });
    return _dispatchResult.failureResult(_widgetId, _opSeq, _errorCode, _err);
  }

  function markPending(_context, _widgetId, _kind, _opSeq) {
    _context.dispatchInternal({
      type: _actionTypes.MARK_PENDING,
      widgetId: _widgetId,
      payload: { kind: _kind, opSeq: _opSeq }
    });
  }

  function clearPending(_context, _widgetId, _opSeq) {
    _context.dispatchInternal({
      type: _actionTypes.CLEAR_PENDING,
      widgetId: _widgetId,
      payload: { opSeq: _opSeq }
    });
  }

  function resolveInitialText(_context, _payload) {
    var dropPayload = (_payload.dropRequest || {}).payload || {};
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
    return _config.defaultText;
  }

  function handleContentCreate(_context, _action) {
    var KDB = _context._KDB;
    var widgetId = _action.widgetId;
    var opSeq = _widgetRuntime.ensureOpSeq(KDB, widgetId, _action.opSeq);
    var shellEl = _view.resolveWidgetShell(widgetId);
    if (!shellEl) {
      return failAndRecord(_context, widgetId, opSeq, "WIDGET_TEXT_SHELL_MISSING");
    }
    var payload = _action.payload || {};
    var nodes = _view.resolveEditableNodes(widgetId, shellEl);
    var initialText;
    if (!nodes || !nodes.editableEl) {
      initialText = resolveInitialText(_context, payload);
      nodes = _view.placeTextContentDom(widgetId, shellEl, _view.buildTextContentDom(initialText));
      if (!nodes || !nodes.editableEl) {
        return failAndRecord(_context, widgetId, opSeq, "WIDGET_TEXT_EDITABLE_MISSING");
      }
    }
    if (_widgetRuntime.isStaleOpSeq(KDB, widgetId, opSeq)) {
      return _dispatchResult.staleResult(widgetId, opSeq);
    }
    if (initialText === undefined) {
      initialText = resolveInitialText(_context, payload);
    }
    var textValue = _view.syncTextContentDom(nodes, initialText);
    _widgetRuntime.storeDomRefs(KDB, widgetId, nodes);
    _context.dispatchInternal({
      type: _actionTypes.REGISTER_CONTENT,
      widgetId: widgetId,
      payload: { text: textValue }
    });
    clearPending(_context, widgetId, opSeq);
    return { ok: true, widgetId: widgetId, opSeq: opSeq, status: "success" };
  }

  async function handleApplyFontSize(_context, _action) {
    var KDB = _context._KDB;
    var widgetId = _action.widgetId;
    var payload = _action.payload || {};
    var opSeq = _widgetRuntime.ensureOpSeq(KDB, widgetId, _action.opSeq);
    markPending(_context, widgetId, "fontSize", opSeq);
    var shellEl = _view.resolveWidgetShell(widgetId);
    if (!shellEl) {
      return failAndRecord(_context, widgetId, opSeq, "WIDGET_TEXT_SHELL_MISSING");
    }
    var nodes = _view.resolveEditableNodes(widgetId, shellEl);
    if (!nodes || !nodes.textNodeForFont) {
      return failAndRecord(_context, widgetId, opSeq, "WIDGET_TEXT_FONT_TARGET_MISSING");
    }
    var applyResult = await _fontSize.applyFontSize(KDB, widgetId, nodes, readRequestedValue(payload));
    if (_widgetRuntime.isStaleOpSeq(KDB, widgetId, opSeq)) {
      return _dispatchResult.staleResult(widgetId, opSeq);
    }
    if (!applyResult.ok) {
      return failAndRecord(
        _context, widgetId, opSeq, applyResult.errorCode || "WIDGET_TEXT_FONT_APPLY_FAILED", applyResult.errorMessage
      );
    }
    clearPending(_context, widgetId, opSeq);
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
  }

  function handleApplyRestyle(_context, _action) {
    var KDB = _context._KDB;
    var widgetId = _action.widgetId;
    var payload = _action.payload || {};
    var opSeq = _widgetRuntime.ensureOpSeq(KDB, widgetId, _action.opSeq);
    markPending(_context, widgetId, "restyle", opSeq);
    var shellEl = _view.resolveWidgetShell(widgetId);
    if (!shellEl) {
      return failAndRecord(_context, widgetId, opSeq, "WIDGET_TEXT_RESTYLE_TARGET_MISSING");
    }
    var applyResult = _view.applyRestyle(shellEl, readRequestedValue(payload));
    if (_widgetRuntime.isStaleOpSeq(KDB, widgetId, opSeq)) {
      return _dispatchResult.staleResult(widgetId, opSeq);
    }
    if (!applyResult.ok) {
      return failAndRecord(
        _context, widgetId, opSeq, applyResult.errorCode || "WIDGET_TEXT_RESTYLE_APPLY_FAILED", applyResult.errorMessage
      );
    }
    clearPending(_context, widgetId, opSeq);
    return {
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
    };
  }

  function handleApplyReadableTextColor(_context, _action) {
    var widgetId = _action.widgetId;
    var payload = _action.payload || {};
    var opSeq = _widgetRuntime.ensureOpSeq(_context._KDB, widgetId, _action.opSeq);
    var textColor = payload.textColor != null ? String(payload.textColor) : "";
    if (!textColor) {
      return _dispatchResult.failureResult(widgetId, opSeq, "WIDGET_TEXT_COLOR_VALUE_MISSING");
    }
    var applyResult = _textStyle.applyReadableTextColor(_context._KDB, widgetId, textColor);
    if (!applyResult.ok) {
      console.warn("[widgetText.applyReadableTextColor] colour rejected", { widgetId: widgetId, errorCode: applyResult.errorCode });
      return _dispatchResult.failureResult(widgetId, opSeq, applyResult.errorCode, applyResult.errorMessage);
    }
    return { ok: true, widgetId: widgetId, opSeq: opSeq, status: "success" };
  }

  // Ends an open inline edit (restoring the original text), removes the scoped <style> elements and drops the
  // per-widget runtime record.
  function cleanupWidgetRuntime(_KDB, _widgetId) {
    var root = _widgetRuntime.readRuntimeRoot(_KDB);
    var runtime = root.byId[_widgetId] || null;
    if (runtime) {
      _textEdit.endOpenEdit(_KDB, _widgetId, runtime);
      var errors = _rt.disposeRuntimeBuckets(runtime);
      if (errors.length) {
        console.error("[widgetText.cleanupWidgetRuntime] cleanup errors", { widgetId: _widgetId }, errors);
      }
    }
    _textStyle.removeAllScopedStyles(runtime, _widgetId);
    delete root.byId[_widgetId];
  }

  function cleanupAllWidgetRuntimes(_KDB) {
    var root = _widgetRuntime.readRuntimeRoot(_KDB);
    Object.keys(root.byId).forEach(function (widgetId) {
      cleanupWidgetRuntime(_KDB, widgetId);
    });
  }

  function handleCleanupContent(_context, _action) {
    var widgetId = _action.widgetId;
    var reason = (_action.payload || {}).reason || "remove";
    cleanupWidgetRuntime(_context._KDB, widgetId);
    _context.dispatchInternal({
      type: _actionTypes.CLEANUP_CONTENT_SUCCEEDED,
      widgetId: widgetId,
      payload: { reason: reason }
    });
    return { ok: true, widgetId: widgetId, opSeq: _action.opSeq, status: "success" };
  }

  return {
    handleContentCreate: handleContentCreate,
    handleApplyFontSize: handleApplyFontSize,
    handleApplyRestyle: handleApplyRestyle,
    handleApplyReadableTextColor: handleApplyReadableTextColor,
    handleCleanupContent: handleCleanupContent,
    cleanupAllWidgetRuntimes: cleanupAllWidgetRuntimes
  };
});

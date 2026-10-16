define([
  "../config/actionTypes.js",
  "../runtime/initializeRuntime.js",
  "../view/resolveWidgetTextShell.js",
  "../view/resolveTextEditableNodes.js",
  "./handleContentCreate.js",
  "./handleCommitTextEdit.js"
], function (
  _actionTypes,
  _initializeRuntime,
  _resolveWidgetTextShell,
  _resolveTextEditableNodes,
  _handleContentCreate,
  _handleCommitTextEdit
) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var MISSING_CORRELATION = "WIDGET_TEXT_WIDGET_CORRELATION_MISSING";

  async function handleParameterSetRestore(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var result = { ok: true, applied: [], skipped: [], diagnostics: [] };
    if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
      return failRun(result, RESTORE_FAILED, "widgetText/parameterSetRestoreRequested requires a numeric runId");
    }
    var runtimeRoot = _initializeRuntime(_context._KDB);
    if (isStale(runtimeRoot, payload.runId)) {
      return cancelRun(result, payload.runId, runtimeRoot.parameterSetRunId);
    }
    runtimeRoot.parameterSetRunId = payload.runId;
    var widgets = Array.isArray(payload.widgets) ? payload.widgets : [];
    var correlation = payload.widgetCorrelation && typeof payload.widgetCorrelation === "object"
      ? payload.widgetCorrelation
      : null;

    for (var idx = 0; idx < widgets.length; idx += 1) {
      if (isStale(runtimeRoot, payload.runId)) {
        return cancelRun(result, payload.runId, runtimeRoot.parameterSetRunId);
      }
      var widget = widgets[idx];
      if (!widget || widget.kind !== "txt") {
        continue;
      }
      var entryIndex = String(idx);
      var linked = correlation ? correlation[entryIndex] : null;
      if (!linked || !linked.widgetId) {
        skipEntry(result, entryIndex, MISSING_CORRELATION, "widgetCorrelation entry missing for txt widget restore");
        continue;
      }
      var widgetId = String(linked.widgetId);
      var nextText = widget.text != null ? String(widget.text) : "";
      var createResult = await ensureTextRegion(_context, widgetId, nextText);
      if (isStale(runtimeRoot, payload.runId)) {
        return cancelRun(result, payload.runId, runtimeRoot.parameterSetRunId);
      }
      if (!createResult || createResult.ok !== true) {
        skipEntry(result, entryIndex, RESTORE_FAILED,
          "text region create/locate failed for widgetId " + widgetId + ": "
          + String(createResult && createResult.errorCode ? createResult.errorCode : "unknown"));
        continue;
      }
      var commitResult = await _handleCommitTextEdit(_context, {
        type: _actionTypes.COMMIT_TEXT_EDIT,
        widgetId: widgetId,
        payload: {
          nextText: nextText,
          isHistoryReplay: payload.skipHistory === true,
          skipHistory: payload.skipHistory === true,
          runId: payload.runId,
          source: payload.source
        }
      });
      if (isStale(runtimeRoot, payload.runId)) {
        return cancelRun(result, payload.runId, runtimeRoot.parameterSetRunId);
      }
      if (!commitResult || commitResult.ok !== true) {
        skipEntry(result, entryIndex, RESTORE_FAILED,
          "text content apply failed for widgetId " + widgetId + ": "
          + String(commitResult && commitResult.errorCode ? commitResult.errorCode : "unknown"));
        continue;
      }
      result.applied.push(widgetId);
    }
    result.ok = result.diagnostics.length === 0;
    return result;
  }

  function ensureTextRegion(_context, _widgetId, _textValue) {
    var shellEl = _resolveWidgetTextShell(_context._KDB, _widgetId);
    if (!shellEl) {
      return Promise.resolve({ ok: false, errorCode: "WIDGET_TEXT_SHELL_MISSING" });
    }
    var nodes = _resolveTextEditableNodes(_context._KDB, _widgetId, shellEl);
    if (nodes && nodes.editableEl) {
      return Promise.resolve({ ok: true });
    }
    return _handleContentCreate(_context, {
      type: _actionTypes.CONTENT_CREATE,
      widgetId: _widgetId,
      payload: { defaultText: _textValue }
    });
  }

  function isStale(_runtimeRoot, _runId) {
    return typeof _runtimeRoot.parameterSetRunId === "number" && _runId < _runtimeRoot.parameterSetRunId;
  }

  function skipEntry(_result, _entryIndex, _code, _message) {
    _result.skipped.push({ entryIndex: _entryIndex, code: _code });
    _result.diagnostics.push({ code: _code, entryIndex: _entryIndex, message: _message });
    _result.ok = false;
  }

  function failRun(_result, _code, _message) {
    _result.ok = false;
    _result.diagnostics.push({ code: _code, message: _message });
    return _result;
  }

  function cancelRun(_result, _runId, _supersedingRunId) {
    _result.ok = false;
    _result.diagnostics.push({
      code: CANCELLED,
      message: "stale parameterSet runId " + _runId + " superseded by " + _supersedingRunId
    });
    return _result;
  }

  return handleParameterSetRestore;
});

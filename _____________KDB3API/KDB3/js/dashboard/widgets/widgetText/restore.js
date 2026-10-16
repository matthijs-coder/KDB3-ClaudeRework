define([
  "./config/actionTypes.js",
  "./effects.js",
  "./textEdit.js",
  "./view.js",
  "./widgetRuntime.js",
  "./dispatchResult.js"
], function (_actionTypes, _effects, _textEdit, _view, _widgetRuntime, _dispatchResult) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var MISSING_CORRELATION = "WIDGET_TEXT_WIDGET_CORRELATION_MISSING";

  function isStaleRun(_runtimeRoot, _runId) {
    return typeof _runtimeRoot.parameterSetRunId === "number" && _runId < _runtimeRoot.parameterSetRunId;
  }

  function staleMessage(_runtimeRoot, _runId) {
    return "stale parameterSet runId " + _runId + " superseded by " + _runtimeRoot.parameterSetRunId;
  }

  function skipEntry(_result, _entryIndex, _code, _message) {
    _result.skipped.push({ entryIndex: _entryIndex, code: _code });
    _result.diagnostics.push({ code: _code, entryIndex: _entryIndex, message: _message });
    _result.ok = false;
  }

  function cancelRun(_result, _runtimeRoot, _runId) {
    _result.ok = false;
    _result.diagnostics.push({ code: CANCELLED, message: staleMessage(_runtimeRoot, _runId) });
    return _result;
  }

  function ensureTextRegion(_context, _widgetId, _textValue) {
    var shellEl = _view.resolveWidgetShell(_widgetId);
    if (!shellEl) {
      return { ok: false, errorCode: "WIDGET_TEXT_SHELL_MISSING" };
    }
    var nodes = _view.resolveEditableNodes(_widgetId, shellEl);
    if (nodes && nodes.editableEl) {
      return { ok: true };
    }
    return _effects.handleContentCreate(_context, {
      type: _actionTypes.CONTENT_CREATE,
      widgetId: _widgetId,
      payload: { defaultText: _textValue }
    });
  }

  // Boundary per restore/reset entry: one throwing widget becomes a failure result and the loop continues.
  async function callEntry(_widgetId, _failCode, _run) {
    try {
      return await _run();
    } catch (err) {
      console.error("[widgetText.restore] entry failed", { widgetId: _widgetId, errorCode: _failCode }, err);
      return _dispatchResult.failureResult(_widgetId, undefined, _failCode, err);
    }
  }

  function describeFailure(_result) {
    return String(_result && _result.errorCode ? _result.errorCode : "unknown");
  }

  async function handleParameterSetRestore(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var result = { ok: true, applied: [], skipped: [], diagnostics: [] };
    if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
      result.ok = false;
      result.diagnostics.push({
        code: RESTORE_FAILED,
        message: "widgetText/parameterSetRestoreRequested requires a numeric runId"
      });
      return result;
    }
    var runtimeRoot = _widgetRuntime.readRuntimeRoot(_context._KDB);
    if (isStaleRun(runtimeRoot, payload.runId)) {
      return cancelRun(result, runtimeRoot, payload.runId);
    }
    runtimeRoot.parameterSetRunId = payload.runId;
    var widgets = Array.isArray(payload.widgets) ? payload.widgets : [];
    var correlation = payload.widgetCorrelation && typeof payload.widgetCorrelation === "object"
      ? payload.widgetCorrelation
      : null;

    for (var idx = 0; idx < widgets.length; idx += 1) {
      if (isStaleRun(runtimeRoot, payload.runId)) {
        return cancelRun(result, runtimeRoot, payload.runId);
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
      var createResult = await callEntry(widgetId, "WIDGET_TEXT_CONTENT_CREATE_FAILED", function () {
        return ensureTextRegion(_context, widgetId, nextText);
      });
      if (isStaleRun(runtimeRoot, payload.runId)) {
        return cancelRun(result, runtimeRoot, payload.runId);
      }
      if (!createResult || createResult.ok !== true) {
        skipEntry(result, entryIndex, RESTORE_FAILED,
          "text region create/locate failed for widgetId " + widgetId + ": " + describeFailure(createResult));
        continue;
      }
      var commitResult = await callEntry(widgetId, "WIDGET_TEXT_EDIT_COMMIT_FAILED", function () {
        return _textEdit.handleCommitTextEdit(_context, {
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
      });
      if (isStaleRun(runtimeRoot, payload.runId)) {
        return cancelRun(result, runtimeRoot, payload.runId);
      }
      if (!commitResult || commitResult.ok !== true) {
        skipEntry(result, entryIndex, RESTORE_FAILED,
          "text content apply failed for widgetId " + widgetId + ": " + describeFailure(commitResult));
        continue;
      }
      result.applied.push(widgetId);
    }
    result.ok = result.diagnostics.length === 0;
    return result;
  }

  // Clears the text records and runtime of the requested widgets. History is never written on this path.
  async function handleParameterSetReset(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var diagnostics = [];
    if (typeof payload.runId !== "number") {
      diagnostics.push({ code: RESET_FAILED, message: "widgetText/parameterSetResetRequested requires a numeric runId" });
      return { ok: false, status: "error", diagnostics: diagnostics };
    }
    var runtimeRoot = _widgetRuntime.readRuntimeRoot(_context._KDB);
    if (isStaleRun(runtimeRoot, payload.runId)) {
      diagnostics.push({ code: CANCELLED, message: staleMessage(runtimeRoot, payload.runId) });
      return { ok: false, status: "cancelled", diagnostics: diagnostics };
    }
    runtimeRoot.parameterSetRunId = payload.runId;

    var byId = _context._KDB.state.widgets.text.byId || {};
    var requested = Array.isArray(payload.widgetIds) ? payload.widgetIds : [];
    for (var idx = 0; idx < requested.length; idx += 1) {
      var widgetId = requested[idx];
      if (!byId[widgetId]) {
        continue;
      }
      var cleanupResult = await callEntry(widgetId, "WIDGET_TEXT_CLEANUP_FAILED", function () {
        return _effects.handleCleanupContent(_context, {
          type: _actionTypes.CLEANUP_CONTENT,
          widgetId: widgetId,
          payload: { reason: "parameterSetReset" }
        });
      });
      if (!cleanupResult || cleanupResult.ok !== true) {
        diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetId,
          message: "text content cleanup failed: " + describeFailure(cleanupResult)
        });
      }
    }
    var ok = diagnostics.length === 0;
    return { ok: ok, status: ok ? "success" : "error", diagnostics: diagnostics };
  }

  return {
    handleParameterSetRestore: handleParameterSetRestore,
    handleParameterSetReset: handleParameterSetReset
  };
});

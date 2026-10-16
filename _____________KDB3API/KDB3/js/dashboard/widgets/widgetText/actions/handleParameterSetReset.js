define([
  "../config/actionTypes.js",
  "../runtime/initializeRuntime.js",
  "./handleCleanupContent.js"
], function (_actionTypes, _initializeRuntime, _handleCleanupContent) {
  "use strict";

  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  // widgetText/parameterSetResetRequested per
  // contracts/widgetBase-parameterSetReset-contractdelta.md: clear text
  // content records and runtime for the requested widgets. History is never
  // written on this path.
  function handleParameterSetReset(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var diagnostics = [];
    if (typeof payload.runId !== "number") {
      diagnostics.push({ code: RESET_FAILED, message: "widgetText/parameterSetResetRequested requires a numeric runId" });
      return Promise.resolve({ ok: false, status: "error", diagnostics: diagnostics });
    }
    var runtimeRoot = _initializeRuntime(_context._KDB);
    if (typeof runtimeRoot.parameterSetRunId === "number" && payload.runId < runtimeRoot.parameterSetRunId) {
      diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + payload.runId + " superseded by " + runtimeRoot.parameterSetRunId });
      return Promise.resolve({ ok: false, status: "cancelled", diagnostics: diagnostics });
    }
    runtimeRoot.parameterSetRunId = payload.runId;

    var widgetIds = collectTextWidgetIds(_context, payload.widgetIds);
    return cleanupSequentially(_context, widgetIds, 0, diagnostics).then(function () {
      var ok = diagnostics.length === 0;
      return { ok: ok, status: ok ? "success" : "error", diagnostics: diagnostics };
    });
  }

  function collectTextWidgetIds(_context, _widgetIds) {
    var requested = Array.isArray(_widgetIds) ? _widgetIds : [];
    var byId = _context._KDB.state.widgets.text && _context._KDB.state.widgets.text.byId
      ? _context._KDB.state.widgets.text.byId
      : {};
    return requested.filter(function (widgetId) {
      return !!byId[widgetId];
    });
  }

  function cleanupSequentially(_context, _widgetIds, _index, _diagnostics) {
    if (_index >= _widgetIds.length) {
      return Promise.resolve();
    }
    var widgetId = _widgetIds[_index];
    return _handleCleanupContent(_context, {
      type: _actionTypes.CLEANUP_CONTENT,
      widgetId: widgetId,
      payload: { reason: "parameterSetReset" }
    }).then(function (cleanupResult) {
      if (!cleanupResult || cleanupResult.ok !== true) {
        _diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetId,
          message: "text content cleanup failed: " + String(cleanupResult && cleanupResult.errorCode ? cleanupResult.errorCode : "unknown")
        });
      }
      return cleanupSequentially(_context, _widgetIds, _index + 1, _diagnostics);
    });
  }

  return handleParameterSetReset;
});

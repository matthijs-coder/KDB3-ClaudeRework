define([
  "../runtime/initializeRuntime.js",
  "../runtime/cleanupWidgetControls.js"
], function (_initializeRuntime, _cleanupWidgetControls) {
  "use strict";

  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  // widgetSettings/parameterSetResetRequested per
  // contracts/widgetBase-parameterSetReset-contractdelta.md: drop committed
  // settings records and detach settings controls (panel/toolbar) for the
  // requested widgets. History is never written on this path.
  function handleParameterSetReset(_KDB, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    if (typeof payload.runId !== "number") {
      diagnostics.push({ code: RESET_FAILED, message: "widgetSettings/parameterSetResetRequested requires a numeric runId" });
      return { ok: false, status: "error", diagnostics: diagnostics };
    }
    var runtime = _initializeRuntime(_KDB);
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId });
      return { ok: false, status: "cancelled", diagnostics: diagnostics };
    }
    runtime.parameterSetRunId = payload.runId;

    var widgetIds = Array.isArray(payload.widgetIds) ? payload.widgetIds : [];
    widgetIds.forEach(function (widgetId) {
      resetWidgetSettings(_KDB, widgetId, diagnostics);
    });
    var ok = diagnostics.length === 0;
    return { ok: ok, status: ok ? "success" : "error", diagnostics: diagnostics };
  }

  function resetWidgetSettings(_KDB, _widgetId, _diagnostics) {
    try {
      _cleanupWidgetControls(_KDB, { widgetId: _widgetId, reason: "parameterSetReset" });
      dropCommittedSettings(_KDB, _widgetId);
    } catch (err) {
      _diagnostics.push({
        code: RESET_FAILED,
        widgetId: _widgetId,
        message: "settings reset failed: " + String(err && err.message ? err.message : err)
      });
    }
  }

  function dropCommittedSettings(_KDB, _widgetId) {
    var settings = _KDB.state.widgets && _KDB.state.widgets.settings ? _KDB.state.widgets.settings : null;
    if (!settings) {
      return;
    }
    if (settings.byWidget && settings.byWidget[_widgetId]) {
      delete settings.byWidget[_widgetId];
    }
    if (settings.ui && settings.ui.openForWidgetId === _widgetId) {
      settings.ui.openForWidgetId = null;
    }
  }

  return handleParameterSetReset;
});

define([
  "../runtime.js",
  "../binding/gates.js",
  "../focus/focusMode.js",
  "../legend/sweep.js"
], function (_visRuntime, _gates, _focusMode, _legendSweep) {
  "use strict";

  // Park, tab-delete en remove zijn dispose-punten (adapter-contract §3.7 /
  // meting M3): observers en pending werk mogen de canvas-plaatsing van de
  // widget niet overleven. Idempotent; zonder runtime-bucket een no-op.
  function handleDisposeWidgetRuntime(_context, _action) {
    var widgetId = _action.widgetId || ((_action.payload || {}).widgetId);
    if (!widgetId) {
      return { ok: false, errorCode: "WIDGET_VIS_WIDGET_ID_MISSING" };
    }
    var _KDB = _context._KDB;
    var runtimeRoot = _KDB.runtime && _KDB.runtime.widgetVis ? _KDB.runtime.widgetVis : null;
    var diagnostics = { reason: (_action.payload || {}).reason || null };
    if (runtimeRoot) {
      diagnostics.dienststelleWaitersCancelled = _gates.cancelGateWaitersForWidget(_KDB, widgetId).dienststelleCancelled;
    }
    var widgetRuntime = runtimeRoot && runtimeRoot.byId ? runtimeRoot.byId[widgetId] : null;
    if (!widgetRuntime) {
      return { ok: true, skipped: true, widgetId: widgetId, status: "success", diagnostics: diagnostics };
    }
    _focusMode.exitNativeFocus(_KDB, widgetId, diagnostics);
    diagnostics.focusMode = _focusMode.disposeFocusMode(_KDB, widgetId, widgetRuntime).diagnostics || {};
    diagnostics.legendObserver = _legendSweep.disconnectLegendTextObserver(widgetRuntime);
    cancelPendingWidgetWork(_KDB, widgetId, widgetRuntime);
    disposeRemainingHandles(widgetRuntime);
    delete runtimeRoot.byId[widgetId];
    return { ok: true, widgetId: widgetId, status: "success", diagnostics: diagnostics };
  }

  function cancelPendingWidgetWork(_KDB, widgetId, widgetRuntime) {
    _visRuntime.rejectContentReadyWaiters(_KDB, widgetId, {
      ok: false,
      widgetId: widgetId,
      status: "cancelled",
      errorCode: "WIDGET_VIS_WIDGET_DISPOSED"
    });
    _visRuntime.abortActiveApply(widgetRuntime);
  }

  function disposeRemainingHandles(widgetRuntime) {
    forEachEntry(widgetRuntime.observers, function (entry) {
      if (entry && typeof entry.disconnect === "function") { entry.disconnect(); }
    });
    forEachEntry(widgetRuntime.timers, function (entry) {
      clearTimeout(entry);
      clearInterval(entry);
    });
    forEachEntry(widgetRuntime.listeners, function (entry) {
      if (typeof entry === "function") { entry(); }
    });
  }

  function forEachEntry(_bucket, _fn) {
    var bucket = _bucket || {};
    Object.keys(bucket).forEach(function (key) {
      try {
        _fn(bucket[key]);
      } catch (ignoreEntry) {
        /* noop */
      }
    });
  }

  return handleDisposeWidgetRuntime;
});

define([
  "../runtime/contentReady.js",
  "../effects/gates/topNGate.js",
  "../effects/abortActiveApply.js",
  "../effects/widgetFocusMode.js",
  "../view/syncLegendVisibility.js"
], function (_contentReady, _topNGate, _abortActiveApply, _widgetFocusMode, _syncLegendVisibility) {
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
      rejectDienststelleGateWaitersForWidget(runtimeRoot, widgetId, diagnostics);
    }
    var widgetRuntime = runtimeRoot && runtimeRoot.byId ? runtimeRoot.byId[widgetId] : null;
    if (!widgetRuntime) {
      return { ok: true, skipped: true, widgetId: widgetId, status: "success", diagnostics: diagnostics };
    }
    _widgetFocusMode.exitNativeFocus(_KDB, widgetId, diagnostics);
    diagnostics.focusMode = _widgetFocusMode.disposeFocusMode(_KDB, widgetId, widgetRuntime).diagnostics || {};
    diagnostics.legendObserver = _syncLegendVisibility.disconnectLegendTextObserver(widgetRuntime);
    cancelPendingWidgetWork(_KDB, widgetId, widgetRuntime);
    disposeRemainingHandles(widgetRuntime);
    delete runtimeRoot.byId[widgetId];
    return { ok: true, widgetId: widgetId, status: "success", diagnostics: diagnostics };
  }

  function cancelPendingWidgetWork(_KDB, widgetId, widgetRuntime) {
    var topNPending = widgetRuntime.pendingPromises ? widgetRuntime.pendingPromises.topNGate : null;
    if (topNPending) {
      _topNGate.cancelTopNGateWaiter(_KDB, widgetId, topNPending.opSeq);
    }
    _contentReady.rejectContentReadyWaiters(_KDB, widgetId, {
      ok: false,
      widgetId: widgetId,
      status: "cancelled",
      errorCode: "WIDGET_VIS_WIDGET_DISPOSED"
    });
    _abortActiveApply(widgetRuntime);
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

  // Zelfde per-widget opruiming als handleParameterSetCancelBindings (de
  // waiters staan op de module-root, gefilterd op widgetId).
  function rejectDienststelleGateWaitersForWidget(_runtimeRoot, _widgetId, _diagnostics) {
    var bucket = _runtimeRoot.pendingPromises ? _runtimeRoot.pendingPromises.dienststelleGate : null;
    if (!bucket || !Array.isArray(bucket.waiters)) {
      return;
    }
    var remaining = [];
    bucket.waiters.forEach(function (entry) {
      if (entry.widgetId !== _widgetId) {
        remaining.push(entry);
        return;
      }
      clearTimeout(entry.timerId);
      if (typeof entry.reject === "function") {
        entry.reject({ cancelled: true });
      }
    });
    _diagnostics.dienststelleWaitersCancelled = bucket.waiters.length - remaining.length;
    bucket.waiters = remaining;
  }

  return handleDisposeWidgetRuntime;
});

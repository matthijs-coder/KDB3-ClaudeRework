define([
  "../config/actionTypes.js",
  "../runtime/initializeRuntime.js",
  "../runtime/contentReady.js",
  "../effects/abortActiveApply.js",
  "../effects/gates/topNGate.js",
  "./handleCleanupContent.js",
], function (_actionTypes, _initializeRuntime, _contentReady, _abortActiveApply, _topNGate, _handleCleanupContent) {
  "use strict";

  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  // widgetVis/parameterSetCancelBindingsRequested per
  // contracts/widgetBase-parameterSetReset-contractdelta.md: cancel in-flight
  // binding work (applies, topN/dienststelle gates, contentReady waiters) and
  // clear the active binding per widget before the shells are parked.
  async function handleParameterSetCancelBindings(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const diagnostics = [];
    if (typeof payload.runId !== "number") {
      diagnostics.push({ code: RESET_FAILED, message: "widgetVis/parameterSetCancelBindingsRequested requires a numeric runId" });
      return { ok: false, status: "error", diagnostics: diagnostics };
    }
    const runtimeRoot = _initializeRuntime(_context._KDB);
    if (typeof runtimeRoot.parameterSetRunId === "number" && payload.runId < runtimeRoot.parameterSetRunId) {
      diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + payload.runId + " superseded by " + runtimeRoot.parameterSetRunId });
      return { ok: false, status: "cancelled", diagnostics: diagnostics };
    }
    runtimeRoot.parameterSetRunId = payload.runId;

    const widgetIds = collectVisWidgetIds(_context, payload.widgetIds);
    let ok = true;
    for (const widgetId of widgetIds) {
      cancelPendingWork(_context._KDB, runtimeRoot, widgetId);
      const cleanupResult = await runContentCleanup(_context, widgetId);
      if (!cleanupResult || (cleanupResult.ok !== true && cleanupResult.stale !== true && cleanupResult.skipped !== true)) {
        ok = false;
        diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetId,
          message: "binding cleanup failed: " + String(cleanupResult && cleanupResult.errorCode ? cleanupResult.errorCode : "unknown"),
        });
      }
    }
    return { ok: ok, status: ok ? "success" : "error", diagnostics: diagnostics };
  }

  function collectVisWidgetIds(_context, _widgetIds) {
    const requested = Array.isArray(_widgetIds) ? _widgetIds : [];
    return requested.filter(function (widgetId) {
      return !!_context.selectors.readVisRecord(_context._KDB, widgetId);
    });
  }

  function cancelPendingWork(_KDB, _runtimeRoot, _widgetId) {
    const widgetRuntime = _runtimeRoot.byId ? _runtimeRoot.byId[_widgetId] : null;
    if (widgetRuntime) {
      const topNPending = widgetRuntime.pendingPromises ? widgetRuntime.pendingPromises.topNGate : null;
      if (topNPending) {
        _topNGate.cancelTopNGateWaiter(_KDB, _widgetId, topNPending.opSeq);
      }
      _contentReady.rejectContentReadyWaiters(_KDB, _widgetId, { ok: false, widgetId: _widgetId, status: "cancelled", errorCode: CANCELLED });
      _abortActiveApply(widgetRuntime);
    }
    rejectDienststelleWaitersForWidget(_runtimeRoot, _widgetId);
  }

  function rejectDienststelleWaitersForWidget(_runtimeRoot, _widgetId) {
    const bucket = _runtimeRoot.pendingPromises ? _runtimeRoot.pendingPromises.dienststelleGate : null;
    if (!bucket || !Array.isArray(bucket.waiters)) {
      return;
    }
    const remaining = [];
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
    bucket.waiters = remaining;
  }

  function runContentCleanup(_context, _widgetId) {
    return Promise.resolve(_handleCleanupContent(_context, {
      type: _actionTypes.CLEANUP_CONTENT,
      widgetId: _widgetId,
      payload: {
        reason: "parameterSetReset",
        clearBinding: true,
        clearDrillthrough: true,
        clearDomDecorations: true,
        isHistoryReplay: false,
      },
    })).catch(function (err) {
      return { ok: false, errorCode: "WIDGET_VIS_CLEANUP_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    });
  }

  return handleParameterSetCancelBindings;
});

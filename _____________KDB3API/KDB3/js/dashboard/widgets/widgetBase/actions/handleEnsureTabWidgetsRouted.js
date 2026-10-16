define([
  "../state/ensureWidgetBaseRuntime.js",
  "../effects/waitForTransferReady.js",
  "./handleRouteAllToLaunchpad.js",
  "./normalizeDispatchResult.js",
  "../../../tabs/effects/hasTabInnerFrame.js"
], function (_ensureWidgetBaseRuntime, _waitForTransferReady, _handleRouteAllToLaunchpad, _normalizeDispatchResult, _hasTabInnerFrame) {
  "use strict";

  // Lazy launchpad routing per contracts/widgetBase-lazyLaunchpadRouting-contractdelta.md.
  function handleEnsureTabWidgetsRouted(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const tabId = typeof payload.tabId === "string" && payload.tabId.length > 0 ? payload.tabId : null;
    if (!tabId) {
      return Promise.resolve(buildResult({ ok: false, errorCode: "WIDGET_BASE_TAB_UNRESOLVED", errorMessage: "ensureTabWidgetsRouted requires a non-empty tabId." }));
    }
    _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(_context._KDB);
    const runtime = _context._KDB.runtime.widgetBase;
    if (isStaleRun(runtime, payload)) {
      return Promise.resolve(buildResult({ ok: false, errorCode: "WRITEBACK_RESTORE_CANCELLED" }));
    }
    if (runtime.routedTabIds[tabId] === true) {
      return Promise.resolve(buildResult({ ok: true, alreadyRouted: true }));
    }
    if (runtime.pendingRouteByTabId[tabId]) {
      return runtime.pendingRouteByTabId[tabId];
    }
    const pending = routeTab(_context, runtime, tabId, payload);
    runtime.pendingRouteByTabId[tabId] = pending;
    return pending;
  }

  // Stale-guard only applies to writebackSet callers that pass a runId, using
  // the module's parameterSet runId convention (see handleParameterSetReset).
  // Event-driven calls carry no runId and are never stale-cancelled.
  function isStaleRun(runtime, payload) {
    if (typeof payload.runId !== "number") {
      return false;
    }
    return typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId;
  }

  function routeTab(context, runtime, tabId, payload) {
    return _waitForTransferReady.waitForCanvasTransferReady(context._KDB).then(function () {
      return _handleRouteAllToLaunchpad(context, {
        type: context.actionTypes.ROUTE_ALL_TO_LAUNCHPAD,
        payload: { tabId: tabId, reason: payload.reason || "tabActivated" }
      }).then(function (result) {
        return finishRoute(runtime, tabId, result, context._KDB);
      });
    }).catch(function (err) {
      clearPending(runtime, tabId);
      return buildResult({ ok: false, errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", errorMessage: String(err && err.message ? err.message : err) });
    });
  }

  function finishRoute(runtime, tabId, _result, _KDB) {
    clearPending(runtime, tabId);
    const result = _result || {};
    if (result.ok === true && mayMarkRouted(result, _hasTabInnerFrame(_KDB, tabId))) {
      runtime.routedTabIds[tabId] = true;
    }
    return buildResult({
      ok: result.ok === true,
      routed: result.routed,
      skipped: result.skipped,
      failed: result.failed,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      missingShells: result.missingShells
    });
  }

  // Empty-snapshot rule (inner-frame delta §4): a zero-widget discovery may
  // mark routedTabIds only when the tab-scoped inner-frame predicate is true.
  // Global whenCanvasReady / transfer-ready is not per-tab proof. Snapshots
  // with model-known widgets whose shells were not in the DOM yet
  // (missingShells, lazy render race) also stay retryable (bugfix 2026-07-12).
  function mayMarkRouted(result, hasInnerFrame) {
    if (readCount(result.missingShells) > 0) {
      return false;
    }
    const isEmptySnapshot = readCount(result.routed) === 0 && readCount(result.skipped) === 0 && readCount(result.failed) === 0;
    return !isEmptySnapshot || hasInnerFrame === true;
  }

  function readCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clearPending(runtime, tabId) {
    if (runtime.pendingRouteByTabId && runtime.pendingRouteByTabId[tabId]) {
      delete runtime.pendingRouteByTabId[tabId];
    }
  }

  function buildResult(_fields) {
    const fields = _fields || {};
    const normalized = _normalizeDispatchResult(Object.assign({ routed: 0, skipped: 0, failed: 0 }, fields));
    normalized.alreadyRouted = fields.alreadyRouted === true;
    normalized.missingShells = fields.alreadyRouted === true ? 0 : readCount(fields.missingShells);
    if (normalized.errorCode === undefined) {
      normalized.errorCode = null;
    }
    return normalized;
  }

  return handleEnsureTabWidgetsRouted;
});

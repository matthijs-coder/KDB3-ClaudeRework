define([
  "../../tabs/effects/hasTabInnerFrame.js",
  "./state.js",
  "./state/selectors.js",
  "./runtime.js",
  "./effects.js",
  "./launchpadTransfer.js",
  "./discovery.js"
], function (_hasTabInnerFrame, _state, _selectors, _runtime, _effects, _launchpadTransfer, _discovery) {
  "use strict";

  const normalizeDispatchResult = _state.normalizeDispatchResult;
  const RENDER_COMPLETE_CAP_MS = 2500;

  function readCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function errorMessageOf(err) {
    return String(err && err.message ? err.message : err);
  }

  function routeDescriptor(context, descriptor, payload) {
    if (descriptor.skipReason) {
      return Promise.resolve({ ok: true, skipped: true, reasonCode: descriptor.skipReason });
    }
    return _launchpadTransfer.handleRouteToLaunchpad(context, {
      type: context.actionTypes.ROUTE_TO_LAUNCHPAD,
      widgetId: descriptor.widgetId,
      payload: {
        reason: payload.reason || "startup",
        sourceModule: "widgetBase",
        tabId: descriptor.tabId,
        widgetType: descriptor.widgetType,
        visualType: descriptor.visualType,
        visualTitle: descriptor.visualTitle,
        isLiveWidget: descriptor.isLiveWidget === true,
        isTextWidget: descriptor.isTextWidget === true,
        isHistoryReplay: false
      }
    });
  }

  async function routeSequentially(context, descriptors, payload, results) {
    for (let index = 0; index < descriptors.length; index += 1) {
      const entry = await routeDescriptor(context, descriptors[index], payload);
      if (entry && entry.skipped) {
        results.skipped += 1;
        if (entry.reasonCode === "WIDGET_BASE_WIDGET_ID_MISSING") {
          results.missingShells += 1;
        }
      } else if (entry && entry.ok) {
        results.routed += 1;
      } else {
        results.failed += 1;
        if (!results.firstErrorCode && entry && entry.errorCode) {
          results.firstErrorCode = entry.errorCode;
        }
      }
    }
  }

  function handleRouteAllToLaunchpad(_context, _action) {
    const payload = (_action && _action.payload) || {};
    if (!_context.isLaunchpadReady()) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_LAUNCHPAD_NOT_READY" }));
    }
    return _launchpadTransfer.waitForCanvasTransferReady(_context._KDB).then(function () {
      return _discovery.discoverCanvasWidgets(_context._KDB, { tabId: payload.tabId || null });
    }).then(function (descriptors) {
      const results = { ok: true, routed: 0, skipped: 0, failed: 0, missingShells: 0, firstErrorCode: null };
      return routeSequentially(_context, descriptors, payload, results).then(function () {
        const normalized = results.failed > 0
          ? normalizeDispatchResult({
            ok: false,
            errorCode: results.firstErrorCode || "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED",
            routed: results.routed,
            skipped: results.skipped,
            failed: results.failed
          })
          : normalizeDispatchResult(results);
        // Shells the canvas model knows but the DOM does not (lazy render race) keep the tab retryable in ensure.
        normalized.missingShells = results.missingShells;
        return normalized;
      });
    });
  }

  function buildEnsureResult(_fields) {
    const fields = _fields || {};
    const normalized = normalizeDispatchResult(Object.assign({ routed: 0, skipped: 0, failed: 0 }, fields));
    normalized.alreadyRouted = fields.alreadyRouted === true;
    normalized.missingShells = fields.alreadyRouted === true ? 0 : readCount(fields.missingShells);
    if (normalized.errorCode === undefined) {
      normalized.errorCode = null;
    }
    return normalized;
  }

  // Only writebackSet callers pass a runId (parameterSet runId convention); event-driven calls are never stale-cancelled.
  function isStaleRun(runtime, payload) {
    if (typeof payload.runId !== "number") {
      return false;
    }
    return typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId;
  }

  // Empty-snapshot rule (inner-frame delta §4): a zero-widget discovery may mark routedTabIds only when the tab-scoped
  // inner-frame predicate holds. Snapshots with model-known widgets whose shells are not in the DOM yet stay retryable.
  function mayMarkRouted(result, hasInnerFrame) {
    if (readCount(result.missingShells) > 0) {
      return false;
    }
    const isEmptySnapshot = readCount(result.routed) === 0 && readCount(result.skipped) === 0 && readCount(result.failed) === 0;
    return !isEmptySnapshot || hasInnerFrame === true;
  }

  function clearPending(runtime, tabId) {
    if (runtime.pendingRouteByTabId && runtime.pendingRouteByTabId[tabId]) {
      delete runtime.pendingRouteByTabId[tabId];
    }
  }

  function finishRoute(runtime, tabId, _result, _KDB) {
    clearPending(runtime, tabId);
    const result = _result || {};
    if (result.ok === true && mayMarkRouted(result, _hasTabInnerFrame(_KDB, tabId))) {
      runtime.routedTabIds[tabId] = true;
    }
    return buildEnsureResult({
      ok: result.ok === true,
      routed: result.routed,
      skipped: result.skipped,
      failed: result.failed,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      missingShells: result.missingShells
    });
  }

  function routeTab(context, runtime, tabId, payload) {
    return _launchpadTransfer.waitForCanvasTransferReady(context._KDB).then(function () {
      return handleRouteAllToLaunchpad(context, {
        type: context.actionTypes.ROUTE_ALL_TO_LAUNCHPAD,
        payload: { tabId: tabId, reason: payload.reason || "tabActivated" }
      }).then(function (result) {
        return finishRoute(runtime, tabId, result, context._KDB);
      });
    }).catch(function (err) {
      clearPending(runtime, tabId);
      return buildEnsureResult({ ok: false, errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", errorMessage: errorMessageOf(err) });
    });
  }

  // Lazy launchpad routing per contracts/widgetBase-lazyLaunchpadRouting-contractdelta.md.
  function handleEnsureTabWidgetsRouted(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const tabId = typeof payload.tabId === "string" && payload.tabId.length > 0 ? payload.tabId : null;
    if (!tabId) {
      return Promise.resolve(buildEnsureResult({ ok: false, errorCode: "WIDGET_BASE_TAB_UNRESOLVED", errorMessage: "ensureTabWidgetsRouted requires a non-empty tabId." }));
    }
    _runtime.ensureWidgetBaseRuntime(_context._KDB);
    const runtime = _context._KDB.runtime.widgetBase;
    if (isStaleRun(runtime, payload)) {
      return Promise.resolve(buildEnsureResult({ ok: false, errorCode: "WRITEBACK_RESTORE_CANCELLED" }));
    }
    if (runtime.routedTabIds[tabId] === true) {
      return Promise.resolve(buildEnsureResult({ ok: true, alreadyRouted: true }));
    }
    if (runtime.pendingRouteByTabId[tabId]) {
      return runtime.pendingRouteByTabId[tabId];
    }
    const pending = routeTab(_context, runtime, tabId, payload);
    runtime.pendingRouteByTabId[tabId] = pending;
    return pending;
  }

  function outcomeReady(outcome) {
    return !!(outcome && outcome.ok === true && outcome.data && outcome.data.ready === true);
  }

  function withCap(promise, capMs) {
    return new Promise(function (resolve) {
      const timerId = setTimeout(function () { resolve(false); }, capMs);
      Promise.resolve(promise).then(function (outcome) {
        clearTimeout(timerId);
        resolve(outcomeReady(outcome));
      }, function () {
        clearTimeout(timerId);
        resolve(false);
      });
    });
  }

  async function renderOne(_KDB, widgetId, renderCompleteCapMs) {
    const widgetsFacet = _effects.readHostFacet(_KDB, "widgetsFacet");
    const canvasFacet = _effects.readHostFacet(_KDB, "canvasFacet");
    if (!widgetsFacet || typeof widgetsFacet.renderWidget !== "function" || !canvasFacet || typeof canvasFacet.whenRenderComplete !== "function") {
      return false;
    }
    try {
      const completion = canvasFacet.whenRenderComplete(widgetId);
      Promise.resolve(completion).catch(function () { return false; });
      const renderOutcome = await widgetsFacet.renderWidget(widgetId);
      if (!renderOutcome || renderOutcome.ok !== true) {
        return false;
      }
      return await withCap(completion, renderCompleteCapMs);
    } catch (err) {
      console.warn("[widgetBase.renderTabWidgets] render failed", widgetId, err);
      return false;
    }
  }

  // Cognos paints visualizations only on a visible page, so callers activate the tab first
  // (tabs traverse waitFor: "widgetsRendered"). Per live widget: explicit render() plus a bounded wait.
  function renderTabWidgets(_KDB, _tabId, _renderCompleteCapMs) {
    const widgetIds = _selectors.readWidgetsByTab(_KDB, _tabId).filter(function (frame) {
      return frame && frame.placement === "onCanvas" && frame.kind === "vis";
    }).map(function (frame) { return frame.widgetId; });
    const capMs = typeof _renderCompleteCapMs === "number" && _renderCompleteCapMs > 0 ? _renderCompleteCapMs : RENDER_COMPLETE_CAP_MS;
    if (widgetIds.length === 0) {
      return Promise.resolve({ ok: true, total: 0, rendered: 0, failed: 0 });
    }
    return Promise.all(widgetIds.map(function (widgetId) {
      return renderOne(_KDB, widgetId, capMs);
    })).then(function (outcomes) {
      const rendered = outcomes.filter(function (outcome) { return outcome === true; }).length;
      return { ok: rendered === widgetIds.length, total: widgetIds.length, rendered: rendered, failed: widgetIds.length - rendered };
    });
  }

  // widgetBase/renderTabWidgetsRequested: render readiness API for tabs traverse waitFor "widgetsRendered".
  // The caller guarantees the tab is active; this only renders and waits, it never activates tabs or mutates widget state.
  function handleRenderTabWidgets(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const tabId = typeof payload.tabId === "string" && payload.tabId.length > 0 ? payload.tabId : null;
    const timeoutMs = typeof payload.timeoutMs === "number" && payload.timeoutMs > 0 ? payload.timeoutMs : undefined;
    if (!tabId) {
      return Promise.resolve({
        ok: false, total: 0, rendered: 0, failed: 0,
        errorCode: "WIDGET_BASE_TAB_UNRESOLVED",
        errorMessage: "renderTabWidgetsRequested requires a non-empty tabId."
      });
    }
    return renderTabWidgets(_context._KDB, tabId, timeoutMs).catch(function (err) {
      console.error("[widgetBase.handleRenderTabWidgets] failed", tabId, err);
      return {
        ok: false, total: 0, rendered: 0, failed: 0,
        errorCode: "WIDGET_BASE_RENDER_TAB_WIDGETS_FAILED",
        errorMessage: errorMessageOf(err)
      };
    });
  }

  return {
    handleRouteAllToLaunchpad: handleRouteAllToLaunchpad,
    handleEnsureTabWidgetsRouted: handleEnsureTabWidgetsRouted,
    handleRenderTabWidgets: handleRenderTabWidgets
  };
});

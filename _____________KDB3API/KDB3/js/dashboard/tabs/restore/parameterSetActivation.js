define([
  "../config/actionTypes.js",
  "../config.js",
  "../actions/guardParameterSetRun.js",
  "../slots.js",
  "../effects/hasTabInnerFrame.js",
  "../../../core/utils/kit/async.js"
], function (_actionTypes, _config, _guard, _slots, _hasTabInnerFrame, _async) {
  "use strict";

  const _codes = _config.parameterSetCodes;

  // Matches the tab-follow cap, not waitForTabContainer's 2 s.
  const INNER_FRAME_CAP_MS = 4000;
  const INNER_FRAME_POLL_MS = 100;
  // Maximum only (liveWidgetsReady delta §7 Q1): the wait ends as soon as every widget wait settles.
  const LIVE_WIDGETS_BUDGET_MS = 5000;

  // tabs/parameterSetActivateTabRequested (contracts/tabs-inner-frame-skip-empty-snapshot-contractdelta.md §3).
  // Temporarily activates the dashboard tab (hidden included) through a singleTab traverse: programmatic click
  // plus defensive re-hide, no persistent visibility/activeIndex change. Skip and wait use the tab-scoped
  // inner-frame predicate, never hasBeenActivated or the global canvas readiness. Success also waits for the
  // tab's live widgets (liveWidgetsReady delta) and never fails on not-ready widgets.
  // forceShow (writeback step 27) never takes the inner-frame skip.
  async function parameterSetActivateTab(_ctx, payload) {
    try {
      return await runActivateTab(_ctx, payload);
    } catch (err) {
      console.error("[tabs.parameterSetActivateTab] failed", err);
      return {
        ok: false,
        tabIdx: payload.tabIdx,
        canvasReady: false,
        diagnostics: [{ code: _codes.TARGET_MISSING, message: String(err && err.message ? err.message : err) }]
      };
    }
  }

  async function runActivateTab(_ctx, payload) {
    const _KDB = _ctx._KDB;
    const tabIdx = payload.tabIdx;
    const guardResult = _guard.guardParameterSetRun(_KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return withActivateShape(guardResult, tabIdx); }

    const slots = _slots.listDashboardSlots(_ctx.getRawState());
    const slot = typeof tabIdx === "number" ? slots[tabIdx] : null;
    if (!slot) {
      return failed(tabIdx, "tabIdx " + tabIdx + " does not map to a dashboard tab slot", null);
    }
    const canSkip = function () {
      return payload.forceShow !== true && _hasTabInnerFrame(_KDB, slot.tabId, slot.pageId);
    };
    if (canSkip()) {
      return finishActivateOk(_ctx, payload, slot, { skippedActivation: true });
    }

    // Delta §4 rule 2: settle startup/traverse work so the traverse coalescing guard cannot reject this run.
    await _guard.waitForInflightTraversals(_KDB);
    if (_guard.isStale(_KDB, payload.runId)) { return withActivateShape(_guard.cancelledResult(), tabIdx); }
    if (canSkip()) {
      return finishActivateOk(_ctx, payload, slot, { skippedActivation: true });
    }

    const traversed = await _ctx.dispatch({
      type: _actionTypes.TRAVERSE,
      payload: {
        source: payload.source || "writebackSet",
        scope: "singleTab",
        tabIndex: slot.index,
        includeHiddenDashboardTabs: payload.includeHiddenDashboardTabs !== false,
        restoreActiveTab: payload.restoreActiveTab === true,
        waitFor: "canvas"
      }
    });
    if (_guard.isStale(_KDB, payload.runId)) { return clickedCancelled(tabIdx); }
    if (traversed !== true) {
      const traversal = (_ctx.getRawState() || {}).traversal || {};
      const detail = traversal.errorCode ? " (" + traversal.errorCode + ")" : "";
      return failed(tabIdx, "tab activation traverse failed" + detail, { clicked: true });
    }

    const frameReady = await waitForTabInnerFrame(_KDB, slot.tabId, slot.pageId);
    if (_guard.isStale(_KDB, payload.runId)) { return clickedCancelled(tabIdx); }
    if (!frameReady) {
      return failed(tabIdx, "tab inner frame did not appear after activation", { clicked: true });
    }
    return finishActivateOk(_ctx, payload, slot, { clicked: true });
  }

  async function finishActivateOk(_ctx, payload, slot, extra) {
    const live = await waitForTabLiveWidgetsReady(_ctx._KDB, slot.tabId);
    if (_guard.isStale(_ctx._KDB, payload.runId)) {
      return Object.assign(withActivateShape(_guard.cancelledResult(), payload.tabIdx), extra);
    }
    return Object.assign({
      ok: true,
      tabIdx: payload.tabIdx,
      canvasReady: true,
      diagnostics: live.diagnostics,
      liveWidgets: live.liveWidgets
    }, extra);
  }

  function failed(tabIdx, message, extra) {
    const diagnostic = extra ? { code: _codes.TARGET_MISSING, tabIdx: tabIdx, message: message } : { code: _codes.TARGET_MISSING, message: message };
    return Object.assign({ ok: false, tabIdx: tabIdx, canvasReady: false }, extra, { diagnostics: [diagnostic] });
  }

  function clickedCancelled(tabIdx) {
    return Object.assign(withActivateShape(_guard.cancelledResult(), tabIdx), { clicked: true });
  }

  function withActivateShape(result, tabIdx) {
    return Object.assign({ tabIdx: tabIdx, canvasReady: false }, result);
  }

  // A newer poll for the same tab aborts the previous one.
  async function waitForTabInnerFrame(_KDB, tabId, pageId) {
    if (_hasTabInnerFrame(_KDB, tabId, pageId)) { return true; }
    const controllers = ensureAbortControllers(_KDB);
    const key = "tabInnerFramePoll:" + String(tabId || "");
    const controller = replaceController(controllers, key);
    const outcome = await _async.pollUntil({
      check: function () { return _hasTabInnerFrame(_KDB, tabId, pageId); },
      timeoutMs: INNER_FRAME_CAP_MS,
      intervalMs: INNER_FRAME_POLL_MS,
      signal: controller.signal
    });
    releaseController(controllers, key, controller);
    if (outcome.reason === "timeout") {
      console.warn("[tabs.waitForTabInnerFrame] timed out", tabId);
    }
    return outcome.ok === true;
  }

  // Waits for the readiness of every live widget on the tab through the canvas facet stamped on runtime.tabs.
  async function waitForTabLiveWidgetsReady(_KDB, tabId) {
    const controllers = ensureAbortControllers(_KDB);
    const key = "tabLiveWidgetsReady:" + String(tabId);
    let controller = null;
    try {
      const facet = _KDB.runtime.tabs.canvasFacet || null;
      if (!facet || typeof facet.listCanvasWidgets !== "function" || typeof facet.whenWidgetReady !== "function") {
        console.warn("[tabs.waitForTabLiveWidgetsReady] canvas facet unavailable", tabId);
        return unavailableResult(tabId, "canvas facet unavailable", "CANVAS_FACET_UNAVAILABLE");
      }
      const list = facet.listCanvasWidgets();
      if (!list || list.ok !== true || !Array.isArray(list.data)) {
        console.warn("[tabs.waitForTabLiveWidgetsReady] canvas widget list failed", tabId, list && list.errorCode);
        return unavailableResult(tabId, "canvas widget list failed", (list && list.errorCode) || null);
      }
      const ids = list.data.filter(function (descriptor) {
        return !!descriptor && descriptor.isLiveWidget === true && String(descriptor.tabId) === String(tabId);
      }).map(function (descriptor) { return descriptor.widgetId; });
      if (ids.length === 0) {
        return { liveWidgets: { count: 0, ready: 0, notReady: [] }, diagnostics: [] };
      }
      controller = replaceController(controllers, key);
      const outcomes = await Promise.all(ids.map(function (widgetId) {
        return armWidgetWait(facet, controller.signal, widgetId);
      }));
      return summarizeLiveWidgets(tabId, ids, outcomes);
    } catch (err) {
      console.error("[tabs.waitForTabLiveWidgetsReady] failed", tabId, err);
      return unavailableResult(tabId, err && err.message, null);
    } finally {
      if (controller && releaseController(controllers, key, controller)) { controller.abort(); }
    }
  }

  function armWidgetWait(facet, signal, widgetId) {
    try {
      return Promise.resolve(facet.whenWidgetReady(widgetId, { signal: signal, budgetMs: LIVE_WIDGETS_BUDGET_MS }))
        .catch(function (err) { return onWaitRejected(widgetId, err); });
    } catch (err) {
      return Promise.resolve(onWaitRejected(widgetId, err));
    }
  }

  function onWaitRejected(widgetId, err) {
    console.error("[tabs.waitForTabLiveWidgetsReady] wait rejected", widgetId, err);
    return { ok: false, outcome: "failed", errorCode: "CANVAS_WAIT_FAILED" };
  }

  function summarizeLiveWidgets(tabId, ids, outcomes) {
    let ready = 0;
    const notReady = [];
    const diagnostics = [];
    ids.forEach(function (widgetId, index) {
      const outcome = outcomes[index] || {};
      if (outcome.ok === true) {
        ready += 1;
        return;
      }
      if (outcome.outcome === "aborted") { return; }
      notReady.push(widgetId);
      diagnostics.push({
        code: _codes.LIVE_WIDGETS_READY_TIMEOUT,
        message: "live widget not ready within budget",
        details: { widgetId: widgetId, tabId: tabId, facetCode: outcome.errorCode || null }
      });
    });
    if (notReady.length > 0) {
      console.warn("[tabs.waitForTabLiveWidgetsReady] live widgets not ready", tabId, notReady);
    }
    return { liveWidgets: { count: ids.length, ready: ready, notReady: notReady }, diagnostics: diagnostics };
  }

  function unavailableResult(tabId, message, facetCode) {
    return {
      liveWidgets: { count: 0, ready: 0, notReady: [] },
      diagnostics: [{ code: _codes.LIVE_WIDGETS_READY_TIMEOUT, message: message, details: { widgetId: null, tabId: tabId, facetCode: facetCode } }]
    };
  }

  function ensureAbortControllers(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.tabs = _KDB.runtime.tabs || {};
    _KDB.runtime.tabs.abortControllers = _KDB.runtime.tabs.abortControllers || {};
    return _KDB.runtime.tabs.abortControllers;
  }

  function replaceController(controllers, key) {
    if (controllers[key]) { controllers[key].abort(); }
    const controller = new AbortController();
    controllers[key] = controller;
    return controller;
  }

  // Returns true when the controller was still the registered one (a newer wait may have replaced it).
  function releaseController(controllers, key, controller) {
    if (controllers[key] !== controller) { return false; }
    delete controllers[key];
    return true;
  }

  return { parameterSetActivateTab: parameterSetActivateTab };
});

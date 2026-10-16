define([
  "../config/actionTypes.js",
  "../config/parameterSetCodes.js",
  "./guardParameterSetRun.js",
  "../slots.js",
  "../effects/hasTabInnerFrame.js",
  "../effects/waitForTabInnerFrame.js",
  "../effects/waitForTabLiveWidgetsReady.js",
], function (_actionTypes, _codes, _guard, _slots, _hasTabInnerFrame, _waitForTabInnerFrame, _waitForTabLiveWidgetsReady) {
  "use strict";

  // tabs/parameterSetActivateTabRequested per
  // contracts/tabs-inner-frame-skip-empty-snapshot-contractdelta.md §3.
  // Temporarily activates the requested dashboard tab (hidden included) by
  // delegating to tabs/traverse singleTab: programmatic click plus defensive
  // re-hide, no persistent visibility/activeIndex mutation. Skip and wait
  // use the tab-scoped inner-frame predicate, not hasBeenActivated and not
  // global getCanvasWhenReady / whenCanvasReady.
  // Success additionally waits for the tab's live widgets per tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md: max 5000 ms, never aborts on not-ready.
  // forceShow: true (step 27 only) does not take the inner-frame skip; guards and a missing slot still return without a click. See writeback-step27-bindPerActiveTab-contractdelta.md.
  async function parameterSetActivateTab(_ctx, _payload) {
    try {
      return await runActivateTab(_ctx, _payload);
    } catch (err) {
      console.error("[tabs.parameterSetActivateTab] failed", err);
      return {
        ok: false, tabIdx: _payload && _payload.tabIdx, canvasReady: false,
        diagnostics: [{ code: _codes.TARGET_MISSING, message: String(err && err.message ? err.message : err) }]
      };
    }
  }

  async function runActivateTab(_ctx, _payload) {
    const payload = _payload || {};
    const tabIdx = payload.tabIdx;
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return withActivateShape(guardResult, tabIdx); }

    const slots = _slots.listDashboardSlots(_ctx.getRawState());
    const slot = typeof tabIdx === "number" ? slots[tabIdx] : null;
    if (!slot) {
      return {
        ok: false, tabIdx: tabIdx, canvasReady: false,
        diagnostics: [{ code: _codes.TARGET_MISSING, message: "tabIdx " + tabIdx + " does not map to a dashboard tab slot" }]
      };
    }

    if (payload.forceShow !== true && _hasTabInnerFrame(_ctx._KDB, slot.tabId, slot.pageId)) {
      return finishActivateOk(_ctx, payload, tabIdx, slot, { skippedActivation: true });
    }

    // Delta §4 rule 2: settle in-flight startup/traverse work first so the
    // traverse coalescing guard cannot reject the writeback activation.
    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return withActivateShape(_guard.cancelledResult(), tabIdx); }
    if (payload.forceShow !== true && _hasTabInnerFrame(_ctx._KDB, slot.tabId, slot.pageId)) {
      return finishActivateOk(_ctx, payload, tabIdx, slot, { skippedActivation: true });
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
    if (_guard.isStale(_ctx._KDB, payload.runId)) {
      return Object.assign(withActivateShape(_guard.cancelledResult(), tabIdx), { clicked: true });
    }

    if (traversed !== true) {
      const traversal = (_ctx.getRawState() || {}).traversal || {};
      return {
        ok: false, tabIdx: tabIdx, canvasReady: false, clicked: true,
        diagnostics: [{
          code: _codes.TARGET_MISSING, tabIdx: tabIdx,
          message: "tab activation traverse failed" + (traversal.errorCode ? " (" + traversal.errorCode + ")" : "")
        }]
      };
    }
    return finishActivateAfterTraverse(_ctx, payload, tabIdx, slot);
  }

  async function finishActivateAfterTraverse(_ctx, payload, tabIdx, slot) {
    try {
      const frame = await _waitForTabInnerFrame(_ctx._KDB, slot.tabId, slot.pageId);
      if (_guard.isStale(_ctx._KDB, payload.runId)) {
        return Object.assign(withActivateShape(_guard.cancelledResult(), tabIdx), { clicked: true });
      }
      if (!frame || frame.ready !== true) {
        return {
          ok: false, tabIdx: tabIdx, canvasReady: false, clicked: true,
          diagnostics: [{
            code: _codes.TARGET_MISSING, tabIdx: tabIdx,
            message: "tab inner frame did not appear after activation"
          }]
        };
      }
      return finishActivateOk(_ctx, payload, tabIdx, slot, { clicked: true });
    } catch (err) {
      console.error("[tabs.parameterSetActivateTab] inner frame wait failed", tabIdx, err);
      return {
        ok: false, tabIdx: tabIdx, canvasReady: false, clicked: true,
        diagnostics: [{
          code: _codes.TARGET_MISSING, tabIdx: tabIdx,
          message: String(err && err.message ? err.message : err)
        }]
      };
    }
  }

  async function finishActivateOk(_ctx, payload, tabIdx, slot, extra) {
    try {
      const live = await _waitForTabLiveWidgetsReady(_ctx._KDB, slot.tabId);
      if (_guard.isStale(_ctx._KDB, payload.runId)) {
        return Object.assign(withActivateShape(_guard.cancelledResult(), tabIdx), extra);
      }
      return Object.assign({
        ok: true, tabIdx: tabIdx, canvasReady: true,
        diagnostics: live.diagnostics, liveWidgets: live.liveWidgets
      }, extra);
    } catch (err) {
      console.error("[tabs.finishActivateOk] failed", tabIdx, err);
      return Object.assign({
        ok: false, tabIdx: tabIdx, canvasReady: false,
        diagnostics: [{ code: _codes.TARGET_MISSING, message: String(err && err.message ? err.message : err) }]
      }, extra);
    }
  }

  function withActivateShape(result, tabIdx) {
    return Object.assign({ tabIdx: tabIdx, canvasReady: false }, result);
  }

  return parameterSetActivateTab;
});

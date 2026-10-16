define([
  "../config/actionTypes.js",
  "../config.js",
  "../actions/guardParameterSetRun.js",
  "../slots.js",
  "../events/eventNames.js",
  "../effects/ensureSlotReadyForMutation.js"
], function (_actionTypes, _config, _guard, _slots, _eventNames, _ensureSlotReady) {
  "use strict";

  const _codes = _config.parameterSetCodes;

  // tabs/parameterSetAbortLandingRequested (contracts/writeback-t2-item5b-contractdelta.md). On SET
  // cancel/fail/abort, lands on the pre-run user tab when it is still visible, otherwise on the first visible
  // dashboard slot. Reuses the mutation restoreOriginalActiveTab so writebackSet never clicks Cognos itself.
  async function parameterSetAbortLanding(_ctx, payload) {
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return guardResult; }

    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return _guard.cancelledResult(); }

    const landing = resolveAbortLanding(_ctx, payload);
    if (landing.landingIndex === null) {
      return { ok: true, diagnostics: [] };
    }
    const original = payload.originalActive || {};
    const restored = await _ensureSlotReady.restoreOriginalActiveTab(_ctx, {
      originalActive: { index: landing.landingIndex, tabId: original.tabId || null },
      didActivate: landing.didActivate
    });
    if (restored !== true) {
      return { ok: false, diagnostics: [{ code: _codes.TRAVERSAL_FAILED, message: "abort landing click failed" }] };
    }
    return { ok: true, diagnostics: [] };
  }

  function resolveAbortLanding(_ctx, payload) {
    const original = payload.originalActive || {};
    const originalIndex = typeof original.index === "number" ? original.index : null;
    if (originalIndex === null) {
      return { landingIndex: null, didActivate: false };
    }
    const slots = _slots.listDashboardSlots(_ctx.getRawState()).filter(Boolean);
    const originalSlot = slots.find(function (slot) { return slot.index === originalIndex; });
    if (originalSlot && originalSlot.visible === true) {
      return { landingIndex: originalIndex, didActivate: payload.didActivate === true };
    }
    const firstVisible = slots.find(function (slot) { return slot.visible === true; });
    if (!firstVisible) {
      return { landingIndex: null, didActivate: false };
    }
    return { landingIndex: firstVisible.index, didActivate: true };
  }

  // tabs/postParameterSetRestoreTraverseRequested (contracts/tabs-parameterSetRestore-contractdelta.md §6):
  // render/lazyload trigger after restore. Every scope except an explicit allDashboard (including the legacy
  // SET alias allDashboardInV3) clicks only the dashboard tabs visible after parameterSetApply. waitFor
  // "widgetsRendered" renders each tab's vis widgets while its page is visible; without it widgets bound on
  // inactive tabs in step 27 stayed empty until a manual tab switch. The traversal lands on the first visible
  // dashboard tab, not on the captured activeIndex, which by now points at the last restore-activated tab.
  async function postParameterSetRestoreTraverse(_ctx, payload) {
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return withTraverseShape(guardResult); }

    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return withTraverseShape(_guard.cancelledResult()); }

    const useVisibleScope = payload.scope !== "allDashboard";
    const traversed = await _ctx.dispatch({
      type: _actionTypes.TRAVERSE,
      payload: {
        source: payload.source || "writebackSet",
        scope: useVisibleScope ? "visibleDashboard" : "allDashboard",
        includeHiddenDashboardTabs: !useVisibleScope && payload.includeHiddenDashboardTabs !== false,
        restoreActiveTab: payload.restoreActiveTab !== false,
        restoreTabIndex: findFirstVisiblePhysicalIndex(_ctx.getRawState()),
        waitFor: "widgetsRendered"
      }
    });
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return withTraverseShape(_guard.cancelledResult()); }

    const state = _ctx.getRawState() || {};
    const traversal = state.traversal || {};
    if (traversed !== true) {
      return {
        ok: false,
        traversedTabIdxs: [],
        diagnostics: [{ code: _codes.TRAVERSAL_FAILED, message: "post-restore tabs traversal failed" + formatErrorCode(traversal) }]
      };
    }
    emitLandingTabChanged(_ctx, state, "postRestoreTraverse");
    return { ok: true, traversedTabIdxs: mapToTabIdxs(state, traversal.traversedIndexes), diagnostics: [] };
  }

  // tabs/writebackGetPersistLandingRequested: persist-lands one dashboard tab after GET validate, then emits
  // tabs:changed so the kdbControl follow runs. No guardParameterSetRun: GET has no SET runId.
  async function writebackGetPersistLanding(_ctx, payload) {
    try {
      const tabIndex = payload.tabIndex;
      if (typeof tabIndex !== "number" || !isFinite(tabIndex)) {
        return { ok: false, diagnostics: [{ code: "TABS_TRAVERSE_INVALID_PAYLOAD", message: "persist landing requires tabIndex" }] };
      }
      await _guard.waitForInflightTraversals(_ctx._KDB);
      const traversed = await _ctx.dispatch({
        type: _actionTypes.TRAVERSE,
        payload: {
          source: "writebackGet",
          scope: "singleTab",
          tabIndex: tabIndex,
          restoreActiveTab: true,
          restoreTabIndex: tabIndex,
          waitFor: "canvas",
          includeHiddenDashboardTabs: false
        }
      });
      if (traversed !== true) {
        const traversal = (_ctx.getRawState() || {}).traversal || {};
        return { ok: false, diagnostics: [{ code: _codes.TRAVERSAL_FAILED, message: "persist landing traverse failed" + formatErrorCode(traversal) }] };
      }
      emitLandingTabChanged(_ctx, _ctx.getRawState() || {}, "writebackGetPersistLanding");
      return { ok: true, diagnostics: [] };
    } catch (err) {
      console.error("[tabs.writebackGetPersistLanding] failed", err);
      return { ok: false, diagnostics: [{ code: _codes.TRAVERSAL_FAILED, message: String(err && err.message ? err.message : err) }] };
    }
  }

  // The traverse commit writes activeIndex before the debounced DOM observer runs, so the observer never emits
  // tabs:changed for the landing tab, and subscribers (kdbControl host move, widgetBase routing, dragDrop rebind)
  // ignore in-flight traversal events. The owner therefore emits one final event for the landing tab.
  function emitLandingTabChanged(_ctx, state, source) {
    const events = _ctx._KDB.events;
    const physicalIndex = typeof state.activeIndex === "number" ? state.activeIndex : null;
    const tab = physicalIndex !== null && state.byIndex ? state.byIndex[String(physicalIndex)] : null;
    if (!events || typeof events.emit !== "function" || !tab) { return; }
    const tabIdx = _slots.listDashboardSlots(state).findIndex(function (slot) { return slot.index === physicalIndex; });
    events.emit(_eventNames.CHANGED, {
      tabIndex: physicalIndex,
      tabIdx: tabIdx >= 0 ? tabIdx : null,
      tabId: tab.tabId || null,
      pageId: tab.pageId || null,
      firstActivation: false,
      source: source
    });
  }

  function findFirstVisiblePhysicalIndex(state) {
    const firstVisible = _slots.listDashboardSlots(state || {}).find(function (tab) { return tab.visible === true; });
    return firstVisible ? firstVisible.index : null;
  }

  function mapToTabIdxs(state, traversedPhysicalIndexes) {
    const tabIdxByPhysicalIndex = {};
    _slots.listDashboardSlots(state).forEach(function (tab, tabIdx) {
      tabIdxByPhysicalIndex[String(tab.index)] = tabIdx;
    });
    return (Array.isArray(traversedPhysicalIndexes) ? traversedPhysicalIndexes : [])
      .map(function (physicalIndex) { return tabIdxByPhysicalIndex[String(physicalIndex)]; })
      .filter(function (tabIdx) { return typeof tabIdx === "number"; });
  }

  function formatErrorCode(traversal) {
    return traversal.errorCode ? " (" + traversal.errorCode + ")" : "";
  }

  function withTraverseShape(result) {
    return Object.assign({ traversedTabIdxs: [] }, result);
  }

  return {
    parameterSetAbortLanding: parameterSetAbortLanding,
    postParameterSetRestoreTraverse: postParameterSetRestoreTraverse,
    writebackGetPersistLanding: writebackGetPersistLanding
  };
});

define([
  "../config/actionTypes.js",
  "../config/parameterSetCodes.js",
  "./guardParameterSetRun.js",
  "../slots.js",
  "../events/eventNames.js",
], function (_actionTypes, _codes, _guard, _slots, _eventNames) {
  "use strict";

  // tabs/postParameterSetRestoreTraverseRequested per
  // contracts/tabs-parameterSetRestore-contractdelta.md §6: render/lazyload
  // trigger after restore. Scope visibleDashboard clicks only dashboard
  // tabs that are visible after parameterSetApply (snapshot without hide:1,
  // plus surplus host slots still visible). Omitted, unknown, and the
  // legacy SET alias allDashboardInV3 map to the same visible set; only
  // an explicit allDashboard payload still includes hidden host slots.
  // Widget/filter restore still activates hidden tabs in steps 18/23.
  // Landing remains the first visible dashboard tab.
  //
  // Bugfix sync 2026-07-13: waitFor "widgetsRendered" — per activated tab the
  // widgets-owned readiness API renders that tab's vis widgets while the page
  // is visible (legacy traverseTabsSafely parity); without this, widgets bound
  // on inactive tabs during step 27 stayed empty until a manual tab switch.
  // The traversal lands on the first visible dashboard tab (restoreTabIndex,
  // legacy parity) instead of the natively captured activeIndex, which by now
  // points at the last restore-activated tab.
  async function postParameterSetRestoreTraverse(_ctx, _payload) {
    const payload = _payload || {};
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
        ok: false, traversedTabIdxs: [],
        diagnostics: [{
          code: _codes.TRAVERSAL_FAILED,
          message: "post-restore tabs traversal failed" + (traversal.errorCode ? " (" + traversal.errorCode + ")" : "")
        }]
      };
    }
    emitLandingTabChanged(_ctx, state);
    return { ok: true, traversedTabIdxs: mapToTabIdxs(state, traversal.traversedIndexes), diagnostics: [] };
  }

  // The traverse commit writes activeIndex before the debounced DOM observer
  // runs, so the observer no-ops and never emits tabs:changed for the landing
  // tab. Subscribers (kdbControl host move, widgetBase routing, dragDrop
  // rebind) suppress or miss in-flight traversal events, so the owner emits
  // one deterministic final event here (bugfix sync 2026-07-13).
  function emitLandingTabChanged(_ctx, state) {
    const events = _ctx._KDB.events;
    const physicalIndex = typeof state.activeIndex === "number" ? state.activeIndex : null;
    const tab = physicalIndex !== null && state.byIndex ? state.byIndex[String(physicalIndex)] : null;
    if (!events || typeof events.emit !== "function" || !tab) { return; }
    const slots = _slots.listDashboardSlots(state);
    const tabIdx = slots.findIndex(function (slot) { return slot.index === physicalIndex; });
    events.emit(_eventNames.CHANGED, {
      tabIndex: physicalIndex,
      tabIdx: tabIdx >= 0 ? tabIdx : null,
      tabId: tab.tabId || null,
      pageId: tab.pageId || null,
      firstActivation: false,
      source: "postRestoreTraverse"
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

  function withTraverseShape(result) {
    return Object.assign({ traversedTabIdxs: [] }, result);
  }

  return postParameterSetRestoreTraverse;
});

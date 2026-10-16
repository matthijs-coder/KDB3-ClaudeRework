define([
  "../config/actionTypes.js",
  "./guardParameterSetRun.js",
  "../state/listDashboardSlots.js",
  "../events/eventNames.js",
], function (_actionTypes, _guard, _listDashboardSlots, _eventNames) {
  "use strict";

  // tabs/writebackGetPersistLandingRequested: persist-land one dashboard tab
  // after GET validate. waitFor canvas; then emit tabs:changed so kdbControl
  // follow runs. Do not call guardParameterSetRun (GET has no SET runId).
  async function writebackGetPersistLanding(_ctx, _payload) {
    try {
      const payload = _payload || {};
      const tabIndex = payload.tabIndex;
      if (typeof tabIndex !== "number" || !isFinite(tabIndex)) {
        return {
          ok: false,
          diagnostics: [{ code: "TABS_TRAVERSE_INVALID_PAYLOAD", message: "persist landing requires tabIndex" }]
        };
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
        return {
          ok: false,
          diagnostics: [{
            code: "WRITEBACK_TABS_TRAVERSAL_FAILED",
            message: "persist landing traverse failed" + (traversal.errorCode ? " (" + traversal.errorCode + ")" : "")
          }]
        };
      }

      emitPersistLandingTabChanged(_ctx, _ctx.getRawState() || {});
      return { ok: true, diagnostics: [] };
    } catch (err) {
      console.error("[tabs.writebackGetPersistLanding] failed", err);
      return {
        ok: false,
        diagnostics: [{
          code: "WRITEBACK_TABS_TRAVERSAL_FAILED",
          message: String(err && err.message ? err.message : err)
        }]
      };
    }
  }

  function emitPersistLandingTabChanged(_ctx, state) {
    try {
      const events = _ctx._KDB.events;
      const physicalIndex = typeof state.activeIndex === "number" ? state.activeIndex : null;
      const tab = physicalIndex !== null && state.byIndex ? state.byIndex[String(physicalIndex)] : null;
      if (!events || typeof events.emit !== "function" || !tab) { return; }
      const slots = _listDashboardSlots(state);
      const tabIdx = slots.findIndex(function (slot) { return slot.index === physicalIndex; });
      events.emit(_eventNames.CHANGED, {
        tabIndex: physicalIndex,
        tabIdx: tabIdx >= 0 ? tabIdx : null,
        tabId: tab.tabId || null,
        pageId: tab.pageId || null,
        firstActivation: false,
        source: "writebackGetPersistLanding"
      });
    } catch (err) {
      console.error("[tabs.writebackGetPersistLanding] emit failed", err);
    }
  }

  return writebackGetPersistLanding;
});

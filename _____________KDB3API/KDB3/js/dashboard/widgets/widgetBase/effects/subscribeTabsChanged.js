define([
  "../../../tabs/events/eventNames.js",
  "../config/actionTypes.js"
], function (_tabsEventNames, _actionTypes) {
  "use strict";

  function noopUnsubscribe() {}

  // Subscribes widgetBase to the tabs:changed fact event so a lazily loaded
  // tab gets its pre-existing canvas widgets routed to the launchpad on first
  // activation (contracts/widgetBase-lazyLaunchpadRouting-contractdelta.md §4).
  function subscribeTabsChanged(_KDB, _dispatch) {
    const events = _KDB ? _KDB.events : null;
    if (!events || typeof events.subscribe !== "function") {
      return noopUnsubscribe;
    }
    // Every activation dispatches: idempotency (routedTabIds) makes routed
    // tabs a cheap no-op, and only this keeps a failed/raced first ensure
    // retryable on the next activation (contract delta §3.5, bugfix sync
    // 2026-07-12 — the previous firstActivation filter made retry unreachable).
    return events.subscribe(_tabsEventNames.CHANGED, function (_payload) {
      const payload = _payload || {};
      if (isTabsSuppressed(_KDB)) {
        return;
      }
      if (!payload.tabId) {
        return;
      }
      dispatchEnsureRouted(_dispatch, payload.tabId);
    });
  }

  // Fire-and-forget: routing failures are logged and never thrown back into
  // the event bus; a failed ensure stays retryable on the next activation.
  function dispatchEnsureRouted(_dispatch, tabId) {
    try {
      Promise.resolve(_dispatch({
        type: _actionTypes.ENSURE_TAB_WIDGETS_ROUTED,
        payload: { tabId: tabId, reason: "tabActivated" }
      })).then(function (result) {
        if (!result || result.ok !== true) {
          console.warn("[widgetBase.subscribeTabsChanged] ensureTabWidgetsRouted did not succeed", tabId, result);
        }
      }).catch(function (err) {
        console.warn("[widgetBase.subscribeTabsChanged] ensureTabWidgetsRouted failed", tabId, err);
      });
    } catch (err) {
      console.warn("[widgetBase.subscribeTabsChanged] subscriber boundary failed", tabId, err);
    }
  }

  function isTabsSuppressed(_KDB) {
    const pendingPromises = _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises;
    return !!(pendingPromises && (pendingPromises.traverse || pendingPromises.startup || pendingPromises.tabMutation));
  }

  return subscribeTabsChanged;
});

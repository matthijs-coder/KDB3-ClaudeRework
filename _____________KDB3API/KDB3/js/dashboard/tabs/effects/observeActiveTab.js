define([
  "../config/actionTypes.js",
  "../config/selectors.js",
  "../events/eventNames.js",
  "../chrome.js",
  "../slots.js",
  "./applyTabPageLoading.js",
  "./bindTabListClickAhead.js"
], function (_actionTypes, _selectors, _eventNames, _chrome, _slots, _applyTabPageLoading, _bindTabListClickAhead) {
  "use strict";

  // Traverse clicks tabs in a ~150ms cadence; coalesce observer bursts so one
  // settled activation change produces exactly one commit + emit.
  const TRAVERSE_DEBOUNCE_MS = 120;
  const USER_DEBOUNCE_MS = 0;

  function startActiveTabObserver(_ctx) {
    try {
      const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
      if (!runtime || _ctx.isDisposed()) { return false; }
      if (runtime.observers.activeTabObserver) {
        _bindTabListClickAhead(_ctx);
        return true;
      }
      if (typeof MutationObserver === "undefined") { return false; }
      const tabListEl = _chrome.resolveTabListElement();
      if (!tabListEl) { return false; }
      const observer = new MutationObserver(scheduleObservedCommit.bind(null, _ctx));
      observer.observe(tabListEl, { attributes: true, attributeFilter: [_selectors.activeSelectedAttribute], subtree: true });
      runtime.observers.activeTabObserver = observer;
      _bindTabListClickAhead(_ctx);
      return true;
    } catch (err) {
      console.error("[tabs.startActiveTabObserver] observer start failed", err);
      return false;
    }
  }

  function scheduleObservedCommit(_ctx) {
    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    if (!runtime || _ctx.isDisposed()) { return; }
    if (runtime.timers.activeTabObserverDebounce) { clearTimeout(runtime.timers.activeTabObserverDebounce); }
    const delayMs = isTabsWorkInFlight(runtime) ? TRAVERSE_DEBOUNCE_MS : USER_DEBOUNCE_MS;
    runtime.timers.activeTabObserverDebounce = setTimeout(function () {
      delete runtime.timers.activeTabObserverDebounce;
      commitObservedActivation(_ctx);
    }, delayMs);
  }

  function isTabsWorkInFlight(runtime) {
    const pendingPromises = runtime && runtime.pendingPromises || {};
    return !!(pendingPromises.traverse || pendingPromises.startup || pendingPromises.tabMutation);
  }

  function commitObservedActivation(_ctx) {
    try {
      if (_ctx.isDisposed()) { return; }
      const tabIndex = _chrome.readAriaSelectedTabIndex();
      const state = _ctx.getRawState();
      if (tabIndex == null || !state || tabIndex === state.activeIndex) { return; }
      const observedTab = state.byIndex && state.byIndex[String(tabIndex)];
      if (!observedTab) { return; }
      const firstActivation = observedTab.hasBeenActivated !== true;
      const source = resolveSource(_ctx._KDB.runtime && _ctx._KDB.runtime.tabs);
      const didCommit = _ctx.dispatch({ type: _actionTypes.ACTIVE_TAB_OBSERVED, payload: { tabIndex: tabIndex, observedAt: Date.now(), source: source } });
      if (didCommit === true) { emitTabsChanged(_ctx, tabIndex, firstActivation, source); }
      if (firstActivation === true && source === "user") {
        _applyTabPageLoading.start(_ctx._KDB, { pageId: observedTab.pageId, tabId: observedTab.tabId, finishWhenReady: true });
      }
    } catch (err) {
      console.error("[tabs.commitObservedActivation] observed activation failed", err);
    }
  }

  function emitTabsChanged(_ctx, tabIndex, firstActivation, source) {
    const events = _ctx._KDB.events;
    if (!events || typeof events.emit !== "function") { return; }
    const state = _ctx.getRawState();
    const tab = state.byIndex && state.byIndex[String(tabIndex)] || {};
    events.emit(_eventNames.CHANGED, {
      tabIndex: tabIndex,
      tabIdx: _slots.resolveDashboardOrderIndex(state, tabIndex),
      tabId: tab.tabId || null,
      pageId: tab.pageId || null,
      firstActivation: firstActivation,
      source: source
    });
  }

  // Best-effort diagnostic attribution only; consumers must not branch on it.
  function resolveSource(runtime) {
    const pendingPromises = runtime && runtime.pendingPromises || {};
    if (pendingPromises.startup) { return "mount"; }
    if (pendingPromises.traverse) { return "api"; }
    return "user";
  }

  return startActiveTabObserver;
});

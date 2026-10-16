define([
  "./config/actionTypes.js",
  "./config.js",
  "./events/eventNames.js",
  "./chrome.js",
  "./slots.js",
  "./pageLoading.js",
  "../../core/utils/kit/runtime.js"
], function (_actionTypes, _config, _eventNames, _chrome, _slots, _pageLoading, _runtime) {
  "use strict";

  // Watches the Cognos tab list: a MutationObserver commits activation changes into state and emits
  // tabs:changed, a capture-phase click listener emits tabs:activationStarted before the page switches.

  // Traverse clicks tabs in a ~150ms cadence; coalesce observer bursts so one settled activation change
  // produces exactly one commit and one emit.
  const TRAVERSE_DEBOUNCE_MS = 120;
  const USER_DEBOUNCE_MS = 0;

  function startActiveTabObserver(_ctx) {
    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    if (!runtime || _ctx.isDisposed()) { return false; }
    if (runtime.observers.activeTabObserver) {
      bindTabListClickAhead(_ctx);
      return true;
    }
    if (typeof MutationObserver === "undefined") { return false; }
    const tabListEl = _chrome.resolveTabListElement();
    if (!tabListEl) { return false; }
    const observer = new MutationObserver(scheduleObservedCommit.bind(null, _ctx));
    observer.observe(tabListEl, { attributes: true, attributeFilter: [_config.selectors.activeSelectedAttribute], subtree: true });
    runtime.observers.activeTabObserver = observer;
    bindTabListClickAhead(_ctx);
    return true;
  }

  function scheduleObservedCommit(_ctx) {
    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    if (!runtime || _ctx.isDisposed()) { return; }
    const delayMs = _runtime.readTabsBusy(_ctx._KDB) ? TRAVERSE_DEBOUNCE_MS : USER_DEBOUNCE_MS;
    _runtime.scheduleTimeout(runtime.timers, "activeTabObserverDebounce", function () {
      commitObservedActivation(_ctx);
    }, delayMs);
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
      const didCommit = _ctx.dispatch({
        type: _actionTypes.ACTIVE_TAB_OBSERVED,
        payload: { tabIndex: tabIndex, observedAt: Date.now(), source: source }
      });
      if (didCommit === true) { emitTabsChanged(_ctx, tabIndex, firstActivation, source); }
      if (firstActivation === true && source === "user") {
        _pageLoading.start(_ctx._KDB, { pageId: observedTab.pageId, tabId: observedTab.tabId, finishWhenReady: true });
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
    return pendingPromises.traverse ? "api" : "user";
  }

  function bindTabListClickAhead(_ctx) {
    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    if (!runtime || _ctx.isDisposed()) { return false; }
    if (runtime.abortControllers && runtime.abortControllers.tabListClick) { return true; }
    if (typeof document === "undefined" || !document.querySelector || typeof AbortController === "undefined") { return false; }
    const tabListEl = _chrome.resolveTabListElement();
    if (!tabListEl || typeof tabListEl.addEventListener !== "function") { return false; }
    const controller = new AbortController();
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.abortControllers.tabListClick = controller;
    tabListEl.addEventListener("click", onTabListCaptureClick.bind(null, _ctx), { capture: true, signal: controller.signal });
    return true;
  }

  function onTabListCaptureClick(_ctx, _event) {
    try {
      if (_ctx.isDisposed() || _runtime.readTabsBusy(_ctx._KDB)) { return; }
      const tabIndex = _chrome.readClickedTabIndex(_event);
      const state = _ctx.getRawState();
      if (tabIndex == null || !state || tabIndex === state.activeIndex) { return; }
      const tab = state.byIndex && state.byIndex[String(tabIndex)];
      const pageId = tab && typeof tab.pageId === "string" && tab.pageId !== "" ? tab.pageId : null;
      if (pageId) { emitActivationStarted(_ctx, tabIndex, tab, pageId, state); }
    } catch (err) {
      console.error("[tabs.tabListClickAhead] click handler failed", err);
    }
  }

  function emitActivationStarted(_ctx, tabIndex, tab, pageId, state) {
    const events = _ctx._KDB.events;
    if (!events || typeof events.emit !== "function") { return; }
    events.emit(_eventNames.ACTIVATION_STARTED, {
      tabIndex: tabIndex,
      tabIdx: _slots.resolveDashboardOrderIndex(state, tabIndex),
      tabId: tab.tabId || null,
      pageId: pageId,
      firstActivation: tab.hasBeenActivated !== true,
      source: "userClick"
    });
  }

  return { startActiveTabObserver: startActiveTabObserver };
});

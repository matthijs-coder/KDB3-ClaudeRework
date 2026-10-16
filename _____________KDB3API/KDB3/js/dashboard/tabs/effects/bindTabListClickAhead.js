define([
  "../events/eventNames.js",
  "../chrome.js",
  "../slots.js"
], function (_eventNames, _chrome, _slots) {
  "use strict";

  function __controller(_ctx) {
    try {
      return bindTabListClickAhead(_ctx);
    } catch (err) {
      console.error("[tabs.bindTabListClickAhead] bind failed", err);
      return false;
    }
  }

  function bindTabListClickAhead(_ctx) {
    var runtime = _ctx && _ctx._KDB && _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    if (!runtime || _ctx.isDisposed()) {
      return false;
    }
    if (runtime.abortControllers && runtime.abortControllers.tabListClick) {
      return true;
    }
    if (typeof document === "undefined" || !document.querySelector) {
      return false;
    }
    var tabListEl = _chrome.resolveTabListElement();
    if (!tabListEl || typeof tabListEl.addEventListener !== "function") {
      return false;
    }
    if (typeof AbortController === "undefined") {
      return false;
    }
    var controller = new AbortController();
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.abortControllers.tabListClick = controller;
    try {
      tabListEl.addEventListener("click", onTabListCaptureClick.bind(null, _ctx), {
        capture: true,
        signal: controller.signal
      });
    } catch (err) {
      controller.abort();
      delete runtime.abortControllers.tabListClick;
      throw err;
    }
    return true;
  }

  function onTabListCaptureClick(_ctx, _event) {
    try {
      if (!_ctx || _ctx.isDisposed()) {
        return;
      }
      if (isTabsWorkInFlight(_ctx._KDB)) {
        return;
      }
      var tabIndex = _chrome.readClickedTabIndex(_event);
      if (tabIndex == null) {
        return;
      }
      var state = _ctx.getRawState();
      if (!state || tabIndex === state.activeIndex) {
        return;
      }
      var tab = state.byIndex && state.byIndex[String(tabIndex)];
      var pageId = tab && typeof tab.pageId === "string" && tab.pageId !== "" ? tab.pageId : null;
      if (!pageId) {
        return;
      }
      emitActivationStarted(_ctx, tabIndex, tab, pageId, state);
    } catch (err) {
      console.error("[tabs.bindTabListClickAhead] click handler failed", err);
    }
  }

  function emitActivationStarted(_ctx, _tabIndex, _tab, _pageId, _state) {
    try {
      var events = _ctx._KDB && _ctx._KDB.events;
      if (!events || typeof events.emit !== "function") {
        return;
      }
      events.emit(_eventNames.ACTIVATION_STARTED, {
        tabIndex: _tabIndex,
        tabIdx: _slots.resolveDashboardOrderIndex(_state, _tabIndex),
        tabId: _tab.tabId || null,
        pageId: _pageId,
        firstActivation: _tab.hasBeenActivated !== true,
        source: "userClick"
      });
    } catch (err) {
      console.error("[tabs.bindTabListClickAhead] emit failed", err);
    }
  }

  function isTabsWorkInFlight(_KDB) {
    var pendingPromises = _KDB && _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises;
    return !!(pendingPromises && (pendingPromises.traverse || pendingPromises.startup || pendingPromises.tabMutation));
  }

  return __controller;
});

define([
  "../../../tabs/events/eventNames.js",
  "../../../../core/utils/kit/runtime.js"
], function (_tabsEventNames, _rt) {
  "use strict";

  // Bounded lazy-render retry (contracts/kdbControl-tabFollow-contractdelta.md section 2): a first tab activation can render
  // the page well after a single settle delay, so retry for about 4 s before giving up.
  var RETRY_DELAY_MS = 400;
  var MAX_RETRIES = 10;
  var RETRY_TIMER_KEY = "tabFollowRetry";

  // The KDB3Widget host exists exactly once in the document; moving it moves the control shell and the launchpad together.
  function resolveKdbWidgetHost(_KDB) {
    var selectors = _KDB.elements && _KDB.elements.selectors;
    var widgetSelector = selectors && selectors.root && selectors.root.kdbWidget;
    var host = widgetSelector ? document.querySelector(widgetSelector) : null;
    return host || (_KDB.elements && _KDB.elements.kdbWidget) || null;
  }

  // Pure DOM placement: re-parents the host into the active tab's page element (element id === tabs pageId).
  // Commits no kdbControl state. Runs from bus events and retry timers, so errors are logged here.
  function moveHostToActiveTab(_KDB, pageId, attempt) {
    var rt = _KDB.runtime && _KDB.runtime.kdbControl;
    if (!rt) return;
    try {
      _rt.clearTimer(rt.timers, RETRY_TIMER_KEY);
      var pageEl = document.getElementById(pageId);
      var host = resolveKdbWidgetHost(_KDB);
      if (pageEl && host) {
        if (host.parentNode !== pageEl) pageEl.appendChild(host);
        return;
      }
      if (attempt < MAX_RETRIES) {
        _rt.scheduleTimeout(rt.timers, RETRY_TIMER_KEY, function () {
          moveHostToActiveTab(_KDB, pageId, attempt + 1);
        }, RETRY_DELAY_MS);
        return;
      }
      console.warn("[kdbControl.followActiveTab] page element or KDB3Widget host not found; host left in place", pageId);
    } catch (err) {
      console.error("[kdbControl.followActiveTab] host move failed", err);
    }
  }

  // Mechanical traversals (startup hydrate, writeback restore) click through every tab; chasing each activation is useless
  // DOM churn. The tabs owner emits one final tabs:changed for the landing tab after a post-restore traverse.
  function onTabsEvent(_KDB, payload) {
    var pageId = payload && typeof payload.pageId === "string" && payload.pageId !== "" ? payload.pageId : null;
    if (!pageId || _rt.readTabsBusy(_KDB)) return;
    moveHostToActiveTab(_KDB, pageId, 0);
  }

  function followActiveTab(_KDB) {
    var rt = _KDB.runtime.kdbControl;
    var bus = _KDB.events;
    if (!bus || typeof bus.subscribe !== "function") return;
    function onEvent(payload) {
      onTabsEvent(_KDB, payload);
    }
    if (_tabsEventNames.CHANGED) rt.subscriptions.tabsChanged = bus.subscribe(_tabsEventNames.CHANGED, onEvent);
    if (_tabsEventNames.ACTIVATION_STARTED) rt.subscriptions.tabsActivationStarted = bus.subscribe(_tabsEventNames.ACTIVATION_STARTED, onEvent);
  }

  return followActiveTab;
});

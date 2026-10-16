define([
  "../../../tabs/events/eventNames",
], function (_tabsEventNames) {

  "use strict";

  // Bounded lazy-render retry per contracts/kdbControl-tabFollow-contractdelta.md
  // §2 (bugfix sync 2026-07-12): a first tab activation can render the page
  // well after a single settle delay, so retry until ~4s before giving up.
  var RETRY_DELAY_MS = 400;
  var MAX_RETRIES = 10;

  function readKdbControlRuntime(_KDB) {
    return (_KDB.runtime && _KDB.runtime.kdbControl) || null;
  }

  // The KDB3Widget host exists exactly once in the document; moving it moves
  // the control shell and the launchpad in one go (contract §3).
  function resolveKdbWidgetHost(_KDB) {
    var selectors = _KDB.elements && _KDB.elements.selectors;
    var widgetSelector = selectors && selectors.root && selectors.root.kdbWidget;
    var host = null;
    if (widgetSelector && typeof document !== "undefined" && document.querySelector) {
      host = document.querySelector(widgetSelector);
    }
    return host || (_KDB.elements && _KDB.elements.kdbWidget) || null;
  }

  function clearRetryTimer(_KDB) {
    var rt = readKdbControlRuntime(_KDB);
    if (!rt || !rt.timers || rt.timers.tabFollowRetry == null) return;
    clearTimeout(rt.timers.tabFollowRetry);
    delete rt.timers.tabFollowRetry;
  }

  function scheduleRetry(_KDB, _pageId, _attempt) {
    var rt = readKdbControlRuntime(_KDB);
    if (!rt) return;
    clearRetryTimer(_KDB);
    rt.timers = rt.timers || {};
    rt.timers.tabFollowRetry = setTimeout(
      moveHostToActiveTab.bind(null, _KDB, _pageId, _attempt),
      RETRY_DELAY_MS
    );
  }

  // Pure DOM-placement effect: re-parents the KDB3Widget host into the active
  // tab's page/dropbox element (element id === tabs pageId). Commits no
  // kdbControl state and never throws into the event bus (contract §2 / §4).
  function moveHostToActiveTab(_KDB, _pageId, _attempt) {
    try {
      // A newer activation supersedes any pending retry for a previous tab.
      clearRetryTimer(_KDB);
      if (typeof document === "undefined" || !document.getElementById) return;
      var pageEl = document.getElementById(_pageId);
      var host = resolveKdbWidgetHost(_KDB);
      if (pageEl && host) {
        if (host.parentNode !== pageEl) pageEl.appendChild(host);
        return;
      }
      if (_attempt < MAX_RETRIES) {
        scheduleRetry(_KDB, _pageId, _attempt + 1);
        return;
      }
      console.warn("[kdbControl.followActiveTab] page element or KDB3Widget host not found; host left in place", _pageId);
    } catch (err) {
      console.error("[kdbControl.followActiveTab] host move failed", err);
    }
  }

  // Mechanical traversals (startup hydrate, writeback restore) click through
  // every tab; chasing each activation is useless DOM churn and left the host
  // stranded on an intermediate tab. The tabs owner emits one final
  // tabs:changed for the landing tab after a post-restore traverse (bugfix
  // sync 2026-07-13), so skipping in-flight traversal events is safe.
  function isTraversalInFlight(_KDB) {
    var pendingPromises = _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises;
    return !!(pendingPromises && (pendingPromises.traverse || pendingPromises.startup || pendingPromises.tabMutation));
  }

  function onTabsChanged(_KDB, _payload) {
    try {
      var pageId = _payload && typeof _payload.pageId === "string" && _payload.pageId !== "" ? _payload.pageId : null;
      if (!pageId) return;
      if (isTraversalInFlight(_KDB)) return;
      moveHostToActiveTab(_KDB, pageId, 0);
    } catch (err) {
      console.error("[kdbControl.followActiveTab] tabs event failed", err);
    }
  }

  function runTabsChangedCleanup(_KDB, _unsubscribe) {
    clearRetryTimer(_KDB);
    if (typeof _unsubscribe === "function") _unsubscribe();
  }

  function __controller(_KDB) {
    try {
      var rt = readKdbControlRuntime(_KDB);
      var bus = _KDB.events;
      if (!rt || !bus || typeof bus.subscribe !== "function") return;
      rt.subscriptions = rt.subscriptions || {};
      subscribeFollowEvent(_KDB, bus, rt, _tabsEventNames.CHANGED, "tabsChanged");
      subscribeFollowEvent(_KDB, bus, rt, _tabsEventNames.ACTIVATION_STARTED, "tabsActivationStarted");
    } catch (err) {
      console.error("[kdbControl.followActiveTab] subscribe failed", err);
    }
  }

  function subscribeFollowEvent(_KDB, _bus, _rt, _eventName, _slot) {
    try {
      if (_rt.subscriptions[_slot] || !_eventName) return;
      var unsubscribe = _bus.subscribe(_eventName, onTabsChanged.bind(null, _KDB));
      _rt.subscriptions[_slot] = runTabsChangedCleanup.bind(null, _KDB, unsubscribe);
    } catch (err) {
      console.error("[kdbControl.followActiveTab] subscribeFollowEvent failed", _slot, err);
    }
  }

  return __controller;

});

define([
  "../../../../core/events/tabs.js",
  "../../../../core/utils/kit/async.js",
  "../../../../core/utils/kit/runtime.js",
  "../../set/state/ensureWritebackRuntime.js",
  "../collectors/collectorSupport.js",
  "./persistLoadingOverlay.js",
  "./persistPopupProbe.js"
], function (_tabsVocabulary, _kitAsync, _kitRuntime, _ensureWritebackRuntime, _support, _persistLoading, _persistPopupProbe) {
  "use strict";

  // After a bridge save the host shows the Cognos "save parameter set" popup on the first visible dashboard
  // tab. Landing moves KDB there, then watches the popup and returns to the tab the user was on.
  // Every wait is tied to runtime.persistRestoreGeneration and abortControllers.persistLanding, so a
  // cancel, a new GET or destroy stops the whole flow within one tick.

  const PERSIST_LANDING_TYPE = _tabsVocabulary.ACTIONS.WRITEBACK_GET_PERSIST_LANDING;
  const RESTORE_TIMER_KEY = "persistRestoreTab";
  const HOST_WAIT_ATTEMPTS = 10;
  const HOST_WAIT_MS = 400;
  const WATCH_POLL_MS = 200;
  const WATCH_STUCK_CAP_MS = 30000;

  async function applyWritebackGetPersistLanding(_KDB) {
    let runtime = null;
    let controller = null;
    let isWatchStarted = false;
    try {
      cancelWritebackGetPersistLanding(_KDB);
      runtime = _ensureWritebackRuntime(_KDB);
      const generation = runtime.persistRestoreGeneration;
      controller = new AbortController();
      runtime.abortControllers.persistLanding = controller;
      const isCurrent = function () {
        return runtime.persistRestoreGeneration === generation && !controller.signal.aborted;
      };

      const tabsApi = _KDB && _KDB.api && _KDB.api.tabs;
      const tabsState = tabsApi ? tabsApi.getState() : null;
      const capturedIndex = tabsState ? tabsState.activeIndex : undefined;
      const firstVisible = readFirstVisibleDashboardIndex(tabsState);
      if (capturedIndex === firstVisible) { return; }
      if (typeof firstVisible !== "number") {
        console.warn("[writebackGet.persistLanding] first visible dashboard index missing");
        return;
      }
      if (!await dispatchPersistLanding(_KDB, firstVisible) || !isCurrent()) { return; }
      const firstTab = tabsState && tabsState.byIndex ? tabsState.byIndex[String(firstVisible)] : null;
      await waitForHostOnPage(_KDB, firstTab && firstTab.pageId, controller.signal);
      if (!isCurrent()) { return; }
      const events = _KDB && _KDB.events;
      if (events && typeof events.subscribe === "function") {
        runtime.subscriptions.persistRestoreTab = events.subscribe(
          _tabsVocabulary.EVENTS.CHANGED, onPersistRestoreTabChanged.bind(null, _KDB)
        );
      }
      startRestoreWatch(_KDB, capturedIndex, generation);
      isWatchStarted = true;
    } catch (error) {
      console.error("[writebackGet.persistLanding] failed", error);
    } finally {
      // The watch keeps the controller until the next cancel; every other exit must not leave a settled one behind.
      if (!isWatchStarted && runtime && runtime.abortControllers.persistLanding === controller) {
        delete runtime.abortControllers.persistLanding;
      }
    }
  }

  // Teardown boundary: called from destroy, tab events and every GET, and must never throw.
  function cancelWritebackGetPersistLanding(_KDB) {
    try {
      const runtime = _ensureWritebackRuntime(_KDB);
      runtime.persistRestoreGeneration = (runtime.persistRestoreGeneration || 0) + 1;
      const controller = runtime.abortControllers.persistLanding;
      delete runtime.abortControllers.persistLanding;
      if (controller) { controller.abort(); }
      _kitRuntime.clearTimer(runtime.timers, RESTORE_TIMER_KEY);
      if (typeof runtime.subscriptions.persistRestoreTab === "function") { runtime.subscriptions.persistRestoreTab(); }
      delete runtime.subscriptions.persistRestoreTab;
    } catch (error) {
      console.warn("[writebackGet.persistLanding] cancel failed", error);
    }
  }

  function readFirstVisibleDashboardIndex(tabsState) {
    if (!tabsState) { return null; }
    const order = Array.isArray(tabsState.order) ? tabsState.order : [];
    const byIndex = tabsState.byIndex || {};
    for (let index = 0; index < order.length; index += 1) {
      const tab = byIndex[String(order[index])];
      if (!_support.isDashboardTab(tab, tabsState) || tab.visible !== true) { continue; }
      return typeof tab.index === "number" ? tab.index : order[index];
    }
    return null;
  }

  // Fire-and-forget from runPersistRestore, so it must never reject.
  async function dispatchPersistLanding(_KDB, _tabIndex) {
    try {
      const tabsApi = _KDB && _KDB.api && _KDB.api.tabs;
      if (!tabsApi) {
        console.warn("[writebackGet.persistLanding] tabs dispatch unavailable");
        return false;
      }
      const result = await tabsApi.dispatch({ type: PERSIST_LANDING_TYPE, payload: { source: "writebackGet", tabIndex: _tabIndex, waitFor: "canvas" } });
      if (result && result.ok !== false) { return true; }
      console.warn("[writebackGet.persistLanding] persist action not ok", result);
      return false;
    } catch (error) {
      console.warn("[writebackGet.persistLanding] persist action failed", error);
      return false;
    }
  }

  function isHostOnPage(_KDB, _pageId) {
    if (typeof document === "undefined" || !document.getElementById) { return false; }
    const pageEl = document.getElementById(_pageId);
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors;
    const widgetSelector = selectors && selectors.root && selectors.root.kdbWidget;
    const host = (widgetSelector && document.querySelector && document.querySelector(widgetSelector))
      || (_KDB.elements && _KDB.elements.kdbWidget) || null;
    return !!(pageEl && host && host.parentNode === pageEl);
  }

  async function waitForHostOnPage(_KDB, _pageId, _signal) {
    if (typeof _pageId !== "string" || !_pageId) {
      console.warn("[writebackGet.persistLanding] landing pageId missing");
      return;
    }
    for (let attempt = 0; attempt < HOST_WAIT_ATTEMPTS; attempt += 1) {
      if (isHostOnPage(_KDB, _pageId)) { return; }
      if (!await _kitAsync.sleep(HOST_WAIT_MS, _signal)) { return; }
    }
    if (!isHostOnPage(_KDB, _pageId)) {
      console.warn("[writebackGet.persistLanding] host did not follow onto landing page", _pageId);
    }
  }

  function onPersistRestoreTabChanged(_KDB, _payload) {
    if (_payload && _payload.source === "writebackGetPersistLanding") { return; }
    cancelWritebackGetPersistLanding(_KDB);
  }

  function runPersistRestore(_KDB, _capturedIndex, _generation) {
    const runtime = _ensureWritebackRuntime(_KDB);
    if (runtime.persistRestoreGeneration !== _generation) { return; }
    const isRestoreActive = !!runtime.parameterSetRestoreActive;
    cancelWritebackGetPersistLanding(_KDB);
    if (isRestoreActive) { return; }
    dispatchPersistLanding(_KDB, _capturedIndex);
  }

  function finishRestoreWatch(_KDB, _capturedIndex, _generation) {
    try {
      runPersistRestore(_KDB, _capturedIndex, _generation);
    } catch (error) {
      console.warn("[writebackGet.persistLoading] restore dispatch failed", error);
    } finally {
      _persistLoading.finish(_KDB);
    }
  }

  // Polls until the host popup appeared and went away (or a restore started, or the stuck cap hit).
  function startRestoreWatch(_KDB, _capturedIndex, _generation) {
    const runtime = _ensureWritebackRuntime(_KDB);
    const startedAt = Date.now();
    let didSeePopup = false;

    function tick() {
      try {
        if (runtime.persistRestoreGeneration !== _generation) { return; }
        if (runtime.parameterSetRestoreActive) {
          finishRestoreWatch(_KDB, _capturedIndex, _generation);
          return;
        }
        const popup = _persistPopupProbe();
        didSeePopup = didSeePopup || !!popup;
        const elapsed = Date.now() - startedAt;
        if (didSeePopup && !popup) {
          finishRestoreWatch(_KDB, _capturedIndex, _generation);
          return;
        }
        if (elapsed >= WATCH_STUCK_CAP_MS) {
          console.warn("[writebackGet.persistLanding] persist popup stuck cap", { elapsedMs: elapsed, didSeePopup: didSeePopup });
          finishRestoreWatch(_KDB, _capturedIndex, _generation);
          return;
        }
        _kitRuntime.scheduleTimeout(runtime.timers, RESTORE_TIMER_KEY, tick, WATCH_POLL_MS);
      } catch (error) {
        console.warn("[writebackGet.persistLanding] restore watch tick failed", error);
      }
    }

    _persistLoading.armCancelWatch(_KDB);
    _kitRuntime.scheduleTimeout(runtime.timers, RESTORE_TIMER_KEY, tick, WATCH_POLL_MS);
  }

  return {
    applyWritebackGetPersistLanding: applyWritebackGetPersistLanding,
    cancelWritebackGetPersistLanding: cancelWritebackGetPersistLanding
  };
});

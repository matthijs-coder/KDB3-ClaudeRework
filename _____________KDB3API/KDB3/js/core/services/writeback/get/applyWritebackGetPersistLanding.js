define([
  "../../../../dashboard/tabs/events/eventNames.js",
  "./scheduleWritebackGetPersistRestore.js"
], function (_eventNames, _scheduleWritebackGetPersistRestore) {
  "use strict";

  const PERSIST_LANDING_TYPE = "tabs/writebackGetPersistLandingRequested";

  async function applyWritebackGetPersistLanding(_KDB) {
    try {
      cancelWritebackGetPersistLanding(_KDB);
      const generation = (readWritebackRuntime(_KDB) || {}).persistRestoreGeneration;
      const tabsApi = _KDB && _KDB.api && _KDB.api.tabs;
      const tabsState = tabsApi && typeof tabsApi.getState === "function" ? tabsApi.getState() : null;
      const capturedIndex = tabsState ? tabsState.activeIndex : undefined;
      const firstVisible = readFirstVisibleDashboardIndex(tabsState);
      if (capturedIndex === firstVisible) { return; }
      if (typeof firstVisible !== "number") {
        console.warn("[writebackGet.persistLanding] first visible dashboard index missing");
        return;
      }
      if (!await dispatchPersistLanding(_KDB, firstVisible)) { return; }
      const firstTab = tabsState && tabsState.byIndex ? tabsState.byIndex[String(firstVisible)] : null;
      await waitForHostOnPage(_KDB, firstTab && firstTab.pageId);
      const runtime = readWritebackRuntime(_KDB);
      if (!runtime || runtime.persistRestoreGeneration !== generation) { return; }
      const events = _KDB && _KDB.events;
      if (events && typeof events.subscribe === "function") {
        runtime.subscriptions.persistRestoreTab = events.subscribe(
          _eventNames.CHANGED, onPersistRestoreTabChanged.bind(null, _KDB)
        );
      }
      _scheduleWritebackGetPersistRestore(_KDB, capturedIndex, generation, runPersistRestore);
    } catch (error) {
      console.error("[writebackGet.persistLanding] failed", error);
    }
  }
  function cancelWritebackGetPersistLanding(_KDB) {
    try {
      const runtime = readWritebackRuntime(_KDB);
      if (!runtime) { return; }
      runtime.persistRestoreGeneration = (runtime.persistRestoreGeneration || 0) + 1;
      clearTimeout(runtime.timers.persistRestoreTab);
      delete runtime.timers.persistRestoreTab;
      if (typeof runtime.subscriptions.persistRestoreTab === "function") { runtime.subscriptions.persistRestoreTab(); }
      delete runtime.subscriptions.persistRestoreTab;
    } catch (error) {
      console.warn("[writebackGet.persistLanding] cancel failed", error);
    }
  }
  function readWritebackRuntime(_KDB) {
    if (!_KDB) { return null; }
    _KDB.runtime = _KDB.runtime || {};
    if (!_KDB.runtime.writeback || typeof _KDB.runtime.writeback !== "object") { _KDB.runtime.writeback = {}; }
    const runtime = _KDB.runtime.writeback;
    if (!runtime.timers || typeof runtime.timers !== "object") { runtime.timers = {}; }
    if (!runtime.subscriptions || typeof runtime.subscriptions !== "object") { runtime.subscriptions = {}; }
    return runtime;
  }
  function readFirstVisibleDashboardIndex(tabsState) {
    if (!tabsState) { return null; }
    const order = Array.isArray(tabsState.order) ? tabsState.order : [];
    const byIndex = tabsState.byIndex || {};
    const maxUserTabs = tabsState.limits && typeof tabsState.limits.maxUserTabs === "number" ? tabsState.limits.maxUserTabs : 5;
    for (let index = 0; index < order.length; index += 1) {
      const tab = byIndex[String(order[index])];
      const isDashboard = tab && (tab.role ? tab.role === "dashboard" : (tab.isHelper !== true && tab.index < maxUserTabs));
      if (!isDashboard || tab.visible !== true) { continue; }
      return typeof tab.index === "number" ? tab.index : order[index];
    }
    return null;
  }

  async function dispatchPersistLanding(_KDB, _tabIndex) {
    try {
      const tabsApi = _KDB && _KDB.api && _KDB.api.tabs;
      if (!tabsApi || typeof tabsApi.dispatch !== "function") {
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

  async function waitForHostOnPage(_KDB, _pageId) {
    try {
      if (typeof _pageId !== "string" || !_pageId) {
        console.warn("[writebackGet.persistLanding] landing pageId missing");
        return;
      }
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (isHostOnPage(_KDB, _pageId)) { return; }
        await delayHostWait();
      }
      if (!isHostOnPage(_KDB, _pageId)) {
        console.warn("[writebackGet.persistLanding] host did not follow onto landing page", _pageId);
      }
    } catch (error) {
      console.warn("[writebackGet.persistLanding] host wait failed", error);
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
  function resolveHostWaitDelay(_resolve) {
    setTimeout(_resolve, 400);
  }
  function delayHostWait() {
    return new Promise(resolveHostWaitDelay);
  }
  function onPersistRestoreTabChanged(_KDB, _payload) {
    try {
      if (_payload && _payload.source === "writebackGetPersistLanding") { return; }
      cancelWritebackGetPersistLanding(_KDB);
    } catch (error) {
      console.warn("[writebackGet.persistLanding] tabs:changed cancel failed", error);
    }
  }

  function runPersistRestore(_KDB, _capturedIndex, _generation) {
    try {
      const runtime = readWritebackRuntime(_KDB);
      if (!runtime || runtime.persistRestoreGeneration !== _generation) { return; }
      const isRestoreActive = !!runtime.parameterSetRestoreActive;
      cancelWritebackGetPersistLanding(_KDB);
      if (isRestoreActive) { return; }
      dispatchPersistLanding(_KDB, _capturedIndex);
    } catch (error) {
      console.warn("[writebackGet.persistLanding] restore failed", error);
    }
  }

  return {
    applyWritebackGetPersistLanding: applyWritebackGetPersistLanding,
    cancelWritebackGetPersistLanding: cancelWritebackGetPersistLanding
  };
});

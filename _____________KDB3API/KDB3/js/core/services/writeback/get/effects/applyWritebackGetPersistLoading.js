define([
  "../../set/state/ensureWritebackRuntime.js",
  "../../../../../dashboard/tabs/events/eventNames.js"
], function (_ensureWritebackRuntime, _eventNames) {
  "use strict";

  // GET persist overlay per overlay-coverage follow-up §3:
  // start after validate / before land (bridge only); finish when land returns
  // (including skip-land). Hold/restore continue without overlay.

  function startWritebackGetPersistLoading(_KDB) {
    try {
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (!loading || typeof loading.startLoading !== "function") {
        return null;
      }
      const mountEl = readGetLoadingMountEl(_KDB);
      if (!mountEl) {
        return null;
      }
      const handle = loading.startLoading({
        mountEl: mountEl,
        mountKey: "writeback-get-persist-loading",
        messageKey: "dashboardSave"
      });
      const runtime = readRuntime(_KDB);
      if (!runtime) {
        return null;
      }
      runtime.pendingPromises.getPersistLoading = handle && handle.mountKey ? handle : null;
      return runtime.pendingPromises.getPersistLoading;
    } catch (error) {
      console.warn("[writebackGet.persistLoading] start failed", error);
      return null;
    }
  }

  function finishWritebackGetPersistLoading(_KDB) {
    try {
      const runtime = readRuntime(_KDB);
      if (!runtime) {
        return;
      }
      clearPersistLoadingCancelWatch(runtime);
      const handle = runtime.pendingPromises.getPersistLoading;
      runtime.pendingPromises.getPersistLoading = null;
      if (!handle) {
        return;
      }
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (loading && typeof loading.finishLoading === "function") {
        loading.finishLoading({ handle: handle });
      }
    } catch (error) {
      console.warn("[writebackGet.persistLoading] finish failed", error);
    }
  }

  function armWritebackGetPersistLoadingCancel(_KDB) {
    try {
      const runtime = readRuntime(_KDB);
      const events = _KDB && _KDB.events;
      if (!runtime || !events || typeof events.subscribe !== "function") {
        return;
      }
      clearPersistLoadingCancelWatch(runtime);
      runtime.subscriptions.persistLoadingCancel = events.subscribe(
        _eventNames.CHANGED,
        onPersistLoadingTabChanged.bind(null, _KDB)
      );
    } catch (error) {
      console.warn("[writebackGet.persistLoading] cancel watch failed", error);
    }
  }

  function onPersistLoadingTabChanged(_KDB, _payload) {
    try {
      if (_payload && _payload.source === "writebackGetPersistLanding") {
        return;
      }
      finishWritebackGetPersistLoading(_KDB);
    } catch (error) {
      console.warn("[writebackGet.persistLoading] tabs:changed finish failed", error);
    }
  }

  function clearPersistLoadingCancelWatch(runtime) {
    try {
      if (!runtime || !runtime.subscriptions) {
        return;
      }
      if (typeof runtime.subscriptions.persistLoadingCancel === "function") {
        runtime.subscriptions.persistLoadingCancel();
      }
      delete runtime.subscriptions.persistLoadingCancel;
    } catch (error) {
      console.warn("[writebackGet.persistLoading] cancel watch clear failed", error);
    }
  }

  function readGetLoadingMountEl(_KDB) {
    try {
      const root = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
      const selector = (root && root.contentViewPane) || ".pane.paneContent.contentViewPane";
      if (typeof document === "undefined" || !document.querySelector) {
        return null;
      }
      return document.querySelector(selector);
    } catch (error) {
      console.warn("[writebackGet.persistLoading] mount resolve failed", error);
      return null;
    }
  }

  function readRuntime(_KDB) {
    try {
      if (!_KDB) {
        return null;
      }
      const runtime = _ensureWritebackRuntime(_KDB);
      if (!runtime.subscriptions || typeof runtime.subscriptions !== "object") {
        runtime.subscriptions = {};
      }
      if (!runtime.pendingPromises || typeof runtime.pendingPromises !== "object") {
        runtime.pendingPromises = {};
      }
      return runtime;
    } catch (error) {
      console.warn("[writebackGet.persistLoading] runtime read failed", error);
      return null;
    }
  }

  return Object.freeze({
    start: startWritebackGetPersistLoading,
    finish: finishWritebackGetPersistLoading,
    armCancelWatch: armWritebackGetPersistLoadingCancel
  });
});

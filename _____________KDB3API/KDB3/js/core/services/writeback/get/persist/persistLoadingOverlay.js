define([
  "../../set/state/ensureWritebackRuntime.js",
  "../../../../../dashboard/tabs/events/eventNames.js"
], function (_ensureWritebackRuntime, _eventNames) {
  "use strict";

  // GET persist overlay per overlay-coverage follow-up §3:
  // start after validate / before land (bridge only); finish when land returns
  // (including skip-land). Hold/restore continue without overlay.
  // The handle lives in runtime.getPersistLoadingHandle, not in a bucket, so a bucket reset during
  // destroy can never orphan a running overlay.

  function readLoadingService(_KDB) {
    return _KDB && _KDB.services ? _KDB.services.loading : null;
  }

  function readGetLoadingMountEl(_KDB) {
    const root = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
    const selector = (root && root.contentViewPane) || ".pane.paneContent.contentViewPane";
    if (typeof document === "undefined" || !document.querySelector) {
      return null;
    }
    return document.querySelector(selector);
  }

  function startWritebackGetPersistLoading(_KDB) {
    const loading = readLoadingService(_KDB);
    if (!loading || typeof loading.startLoading !== "function") {
      return null;
    }
    try {
      const mountEl = readGetLoadingMountEl(_KDB);
      if (!mountEl) {
        return null;
      }
      const handle = loading.startLoading({
        mountEl: mountEl,
        mountKey: "writeback-get-persist-loading",
        messageKey: "dashboardSave"
      });
      const runtime = _ensureWritebackRuntime(_KDB);
      runtime.getPersistLoadingHandle = handle && handle.mountKey ? handle : null;
      return runtime.getPersistLoadingHandle;
    } catch (error) {
      console.warn("[writebackGet.persistLoading] start failed", error);
      return null;
    }
  }

  function clearPersistLoadingCancelWatch(runtime) {
    if (typeof runtime.subscriptions.persistLoadingCancel === "function") {
      runtime.subscriptions.persistLoadingCancel();
    }
    delete runtime.subscriptions.persistLoadingCancel;
  }

  function finishWritebackGetPersistLoading(_KDB) {
    try {
      const runtime = _ensureWritebackRuntime(_KDB);
      clearPersistLoadingCancelWatch(runtime);
      const handle = runtime.getPersistLoadingHandle;
      runtime.getPersistLoadingHandle = null;
      const loading = readLoadingService(_KDB);
      if (handle && loading && typeof loading.finishLoading === "function") {
        loading.finishLoading({ handle: handle });
      }
    } catch (error) {
      console.warn("[writebackGet.persistLoading] finish failed", error);
    }
  }

  function onPersistLoadingTabChanged(_KDB, _payload) {
    if (_payload && _payload.source === "writebackGetPersistLanding") {
      return;
    }
    finishWritebackGetPersistLoading(_KDB);
  }

  function armWritebackGetPersistLoadingCancel(_KDB) {
    const events = _KDB && _KDB.events;
    if (!events || typeof events.subscribe !== "function") {
      return;
    }
    try {
      const runtime = _ensureWritebackRuntime(_KDB);
      clearPersistLoadingCancelWatch(runtime);
      runtime.subscriptions.persistLoadingCancel = events.subscribe(
        _eventNames.CHANGED,
        onPersistLoadingTabChanged.bind(null, _KDB)
      );
    } catch (error) {
      console.warn("[writebackGet.persistLoading] cancel watch failed", error);
    }
  }

  return Object.freeze({
    start: startWritebackGetPersistLoading,
    finish: finishWritebackGetPersistLoading,
    armCancelWatch: armWritebackGetPersistLoadingCancel
  });
});

define(["../state/ensureWritebackRuntime.js"], function (_ensureWritebackRuntime) {
  "use strict";

  // Loading-service guards per contracts/writeback.md §6 step 5/30: best-effort,
  // a loading failure never influences the restore outcome.
  // Overlay-coverage: SET mounts .dashboardFrame; urlShareBootOverlayActive is a
  // no-op and must not coalesce onto kdb-root-loading-animation-mount.

  function startLoadingGuarded(_KDB, run) {
    var runtime;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      if (runtime.urlShareBootOverlayActive === true) {
        return false;
      }
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (!loading || typeof loading.startLoading !== "function") {
        return false;
      }
      const mountEl = readSetLoadingMountEl(_KDB);
      if (!mountEl) {
        return false;
      }
      const handle = loading.startLoading({
        mountEl: mountEl,
        mountKey: "writeback-set-loading",
        sessionMessageKey: "dashboardRestore"
      });
      run.loadingHandle = handle;
      run.loadingStarted = !!(handle && handle.mountKey);
      return run.loadingStarted;
    } catch (error) {
      console.warn("[writebackSet] startLoading failed", error);
      return false;
    }
  }

  function finishLoadingGuarded(_KDB, run) {
    try {
      if (!run || run.loadingStarted !== true) {
        return;
      }
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (loading && typeof loading.finishLoading === "function") {
        loading.finishLoading({ handle: run.loadingHandle });
      }
    } catch (error) {
      console.warn("[writebackSet] finishLoading failed", error);
    }
  }

  function readSetLoadingMountEl(_KDB) {
    try {
      const root = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
      const selector = (root && root.dashboardFrame) || ".dashboardFrame";
      if (typeof document === "undefined" || !document.querySelector) {
        return null;
      }
      return document.querySelector(selector);
    } catch (error) {
      console.warn("[writebackSet] startLoading mount resolve failed", error);
      return null;
    }
  }

  return Object.freeze({
    startLoadingGuarded: startLoadingGuarded,
    finishLoadingGuarded: finishLoadingGuarded,
  });
});

define(["../../canvas/kdbControl/config/domSelectors.js"], function (_kdbControlSelectors) {
  "use strict";

  const MOUNT_KEY = "kdb-metrics-tree-loading";

  function start(_options) {
    try {
      const _KDB = _options && _options._KDB;
      const loading = _KDB && _KDB.services && _KDB.services.loading;
      if (!loading || typeof loading.startLoading !== "function") {
        return null;
      }
      const rootSelector = _kdbControlSelectors && _kdbControlSelectors.mainBlocksSelector;
      if (!rootSelector || typeof document === "undefined" || !document.querySelector) {
        return null;
      }
      const mountEl = document.querySelector(rootSelector);
      if (!mountEl) {
        return null;
      }
      return loading.startLoading({
        mountEl: mountEl,
        mountKey: MOUNT_KEY,
        messageKey: "metrics"
      });
    } catch (err) {
      console.error("[metricsTree.applyMetricsTreeLoading.start] failed", err);
      return null;
    }
  }

  function finish(_options) {
    try {
      const _KDB = _options && _options._KDB;
      const loading = _KDB && _KDB.services && _KDB.services.loading;
      if (!loading || typeof loading.finishLoading !== "function") {
        return;
      }
      loading.finishLoading({ mountKey: MOUNT_KEY });
    } catch (err) {
      console.error("[metricsTree.applyMetricsTreeLoading.finish] failed", err);
    }
  }

  return { start: start, finish: finish };
});

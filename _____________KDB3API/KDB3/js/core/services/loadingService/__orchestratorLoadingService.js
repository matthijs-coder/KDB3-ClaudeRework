define([
  "./createLoadingService.js",
  "./config/loadingLabels.js"
], function (_createLoadingService, _loadingLabels) {
  "use strict";

  function __orchestrator(_KDB) {
    try {
      _KDB.services = _KDB.services || {};
      mergeLoadingLabels(_KDB);
      _KDB.services.loading = _createLoadingService(_KDB);
      return _KDB.services.loading;
    } catch (error) {
      console.error("[loadingService.__orchestrator] failed", error);
      throw error;
    }
  }

  function mergeLoadingLabels(_KDB) {
    var existing;
    try {
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
      existing = _KDB.config.labels.de.loading && typeof _KDB.config.labels.de.loading === "object"
        ? _KDB.config.labels.de.loading
        : {};
      _KDB.config.labels.de.loading = Object.assign({}, _loadingLabels, existing);
    } catch (error) {
      console.error("[loadingService.mergeLoadingLabels] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});

define([
  "./config/homeDialogLabels.js",
  "./runtime/ensureHomeDialogRuntime.js",
  "./presentHomeChoice.js",
  "./presentCubesUnavailable.js"
], function (_homeDialogLabels, _ensureHomeDialogRuntime, _presentHomeChoice, _presentCubesUnavailable) {
  "use strict";

  function mergeHomeDialogLabels(_KDB) {
    var existing;
    try {
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
      existing = _KDB.config.labels.de.homeDialog && typeof _KDB.config.labels.de.homeDialog === "object"
        ? _KDB.config.labels.de.homeDialog
        : {};
      _KDB.config.labels.de.homeDialog = Object.assign({}, _homeDialogLabels, existing);
    } catch (error) {
      console.error("[homeDialog.mergeHomeDialogLabels] failed", error);
      throw error;
    }
  }

  function stampHomeDialogFacets(_KDB, _runtime) {
    var cognosHost;
    try {
      cognosHost = _KDB.services && _KDB.services.cognosHost;
      _runtime.dataSourcesFacet = (cognosHost && cognosHost.dataSources) || null;
      _runtime.dashboardFacet = (cognosHost && cognosHost.dashboard) || null;
    } catch (error) {
      console.error("[homeDialog.stampHomeDialogFacets] failed", error);
      throw error;
    }
  }

  function __orchestrator(_KDB) {
    try {
      var runtime;
      mergeHomeDialogLabels(_KDB);
      runtime = _ensureHomeDialogRuntime(_KDB);
      stampHomeDialogFacets(_KDB, runtime);
      runtime.presentHomeChoice = _presentHomeChoice;
      runtime.presentCubesUnavailable = _presentCubesUnavailable;
      return runtime;
    } catch (error) {
      console.error("[homeDialog.__orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});

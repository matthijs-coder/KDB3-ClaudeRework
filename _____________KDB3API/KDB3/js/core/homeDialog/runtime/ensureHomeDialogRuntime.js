define([], function () {
  "use strict";

  function __controller(_KDB) {
    try {
      var runtime;
      _KDB.runtime = _KDB.runtime || {};
      runtime = _KDB.runtime.homeDialog;
      if (!runtime || typeof runtime !== "object") {
        runtime = {};
        _KDB.runtime.homeDialog = runtime;
      }
      if (!Object.prototype.hasOwnProperty.call(runtime, "dataSourcesFacet")) {
        runtime.dataSourcesFacet = null;
      }
      if (!Object.prototype.hasOwnProperty.call(runtime, "dashboardFacet")) {
        runtime.dashboardFacet = null;
      }
      if (!Object.prototype.hasOwnProperty.call(runtime, "presentHomeChoice")) {
        runtime.presentHomeChoice = null;
      }
      if (!Object.prototype.hasOwnProperty.call(runtime, "presentCubesUnavailable")) {
        runtime.presentCubesUnavailable = null;
      }
      return runtime;
    } catch (error) {
      console.error("[homeDialog.ensureHomeDialogRuntime] failed", error);
      throw error;
    }
  }

  return __controller;
});

define([
  "./runNormalRestore.js",
  "./runNewDashboardReset.js"
], function (_runNormalRestore, _runNewDashboardReset) {
  "use strict";

  return {
    runNormalRestore: _runNormalRestore,
    runNewDashboardReset: _runNewDashboardReset
  };
});

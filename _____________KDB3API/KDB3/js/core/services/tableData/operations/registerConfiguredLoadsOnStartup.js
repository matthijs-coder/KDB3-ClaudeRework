define([], function () {
  "use strict";

  function __controller(_KDB) {
    const tableDataService = _KDB.services && _KDB.services.tableData;
    const registryReady = tableDataService && typeof tableDataService.registerConfiguredLoads === "function" ? tableDataService.registerConfiguredLoads() : null;
    if (registryReady && typeof registryReady.catch === "function") {
      registryReady.catch(logRegistryFailure);
    }
  }

  function logRegistryFailure(error) {
    console.error("[tableDataService.registerConfiguredLoadsOnStartup]", error);
  }

  return __controller;
});

define(["./clearRuntimeLoad.js"], function (_clearRuntimeLoad) {
  "use strict";

  function abortTableLoad(_KDB, tableKey) {
    try {
      const controllers = _KDB && _KDB.runtime && _KDB.runtime.tableData
        ? _KDB.runtime.tableData.abortControllers
        : null;
      const controller = controllers && tableKey ? controllers[tableKey] : null;
      if (controller && typeof controller.abort === "function") {
        controller.abort();
      }
      if (tableKey) {
        _clearRuntimeLoad(_KDB, tableKey);
      }
    } catch (error) {
      console.error("[tableDataService.abortTableLoad] failed", { tableKey: tableKey }, error);
    }
  }

  return abortTableLoad;
});

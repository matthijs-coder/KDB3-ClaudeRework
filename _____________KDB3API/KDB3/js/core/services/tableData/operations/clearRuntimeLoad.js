define([], function () {
  "use strict";

  function clearRuntimeLoad(_KDB, tableKey) {
    if (!tableKey || !_KDB.runtime || !_KDB.runtime.tableData) {
      return;
    }
    delete _KDB.runtime.tableData.pendingLoads[tableKey];
    delete _KDB.runtime.tableData.abortControllers[tableKey];
  }

  return clearRuntimeLoad;
});

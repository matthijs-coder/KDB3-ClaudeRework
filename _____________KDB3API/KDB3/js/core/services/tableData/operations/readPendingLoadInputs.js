define(["../input/resolveTableKey.js"], function (_resolveTableKey) {
  "use strict";

  function readPendingLoadInputs(_KDB, _inputs) {
    var key;
    var tableData;
    var pendingLoads;
    var pending;
    try {
      if (!Array.isArray(_inputs) || _inputs.length !== 1) {
        return null;
      }
      key = _resolveTableKey(_inputs[0]);
      if (!key) {
        return null;
      }
      tableData = _KDB && _KDB.runtime && _KDB.runtime.tableData;
      pendingLoads = tableData && tableData.pendingLoads;
      if (!pendingLoads || typeof pendingLoads !== "object") {
        return null;
      }
      pending = pendingLoads[key];
      if (pending && typeof pending.then === "function") {
        return pending;
      }
      return null;
    } catch (error) {
      console.error("[tableData.readPendingLoadInputs]", error);
      throw error;
    }
  }

  return readPendingLoadInputs;
});

define(["./abortTableLoad.js", "../input/resolveTableKey.js"], function (_abortTableLoad, _resolveTableKey) {
  "use strict";

  function abortAllLoads(_KDB) {
    try {
      const keys = Object.keys(_KDB.runtime.tableData.abortControllers || {});
      for (let index = 0; index < keys.length; index += 1) {
        _abortTableLoad(_KDB, keys[index]);
      }
    } catch (error) {
      console.error("[tableDataService.abortAllLoads] failed", error);
      throw error;
    }
  }

  function abortTableInputs(_KDB, _inputs) {
    try {
      const inputs = Array.isArray(_inputs) ? _inputs : [];
      for (let index = 0; index < inputs.length; index += 1) {
        const tableKey = _resolveTableKey(inputs[index]);
        if (tableKey) {
          _abortTableLoad(_KDB, tableKey);
        }
      }
    } catch (error) {
      console.error("[tableDataService.abortTableInputs] failed", error);
      throw error;
    }
  }

  return { abortAllLoads: abortAllLoads, abortTableInputs: abortTableInputs };
});

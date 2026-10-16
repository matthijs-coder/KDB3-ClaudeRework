define([
  "../input/resolveTableKey.js",
  "../state/writers/markTableLoading.js",
  "./abortTableLoad.js",
  "./createTablePayload.js",
  "./runLoadTableWork.js",
], function (_resolveTableKey, _markTableLoading, _abortTableLoad, _createTablePayload, _runLoadTableWork) {
  "use strict";

  function startTableLoad(_KDB, _input, shouldAbortExisting) {
    const input = _input;
    const tableKey = _resolveTableKey(input);
    if (!tableKey) {
      return Promise.resolve(null);
    }
    if (shouldAbortExisting) {
      _abortTableLoad(_KDB, tableKey);
    } else if (_KDB.runtime.tableData.pendingLoads[tableKey]) {
      return _KDB.runtime.tableData.pendingLoads[tableKey];
    }
    const controller = new AbortController();
    _KDB.runtime.tableData.abortControllers[tableKey] = controller;
    _markTableLoading(_KDB, _createTablePayload(input, tableKey, input.widgetId, null));
    const pending = _runLoadTableWork(_KDB, input, controller.signal);
    _KDB.runtime.tableData.pendingLoads[tableKey] = pending;
    return pending;
  }

  return startTableLoad;
});

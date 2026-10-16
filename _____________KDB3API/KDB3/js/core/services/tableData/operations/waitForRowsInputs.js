define([
  "../input/resolveTableKey.js",
  "./loadTableInputs.js",
  "./readTableEntry.js",
  "./resolveInputPromises.js",
  "./shapeTableRows.js",
], function (_resolveTableKey, _loadTableInputs, _readTableEntry, _resolveInputPromises, _shapeTableRows) {
  "use strict";

  function waitForRowsInputs(_KDB, inputs) {
    const promises = [];
    for (let index = 0; index < inputs.length; index += 1) {
      promises.push(waitForRowsInput(_KDB, inputs[index]));
    }
    return _resolveInputPromises(inputs, promises);
  }

  function waitForRowsInput(_KDB, input) {
    if (input && input.isCoreTable === true) {
      return waitForCoreRowsInput(_KDB, input);
    }
    return readOrLoadRows(_KDB, input);
  }

  function waitForCoreRowsInput(_KDB, input) {
    const registryReady = _KDB.runtime && _KDB.runtime.tableData && _KDB.runtime.tableData.loadRegistryReady;
    return registryReady && typeof registryReady.then === "function" ? registryReady.then(function () {
      return readOrLoadRows(_KDB, input);
    }) : readOrLoadRows(_KDB, input);
  }

  function readOrLoadRows(_KDB, input) {
    const tableKey = _resolveTableKey(input);
    const pending = tableKey && _KDB.runtime.tableData.pendingLoads[tableKey];
    const entry = _readTableEntry(_KDB, input);
    if (!pending && !(entry && entry.lifecycle === "ready")) {
      return _loadTableInputs(_KDB, [input]);
    }
    const rowsPromise = pending || Promise.resolve(entry.sourceRows || entry.rows);
    return rowsPromise.then(function (rows) {
      return _shapeTableRows(rows, input.shape, input.pick);
    });
  }

  return waitForRowsInputs;
});

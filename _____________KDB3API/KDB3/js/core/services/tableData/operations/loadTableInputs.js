define([
  "./readTableEntry.js",
  "./resolveInputPromises.js",
  "./startTableLoad.js",
  "./shapeTableRows.js",
], function (_readTableEntry, _resolveInputPromises, _startTableLoad, _shapeTableRows) {
  "use strict";

  function loadTableInputs(_KDB, inputs) {
    const promises = [];
    for (let index = 0; index < inputs.length; index += 1) {
      promises.push(loadTableInput(_KDB, inputs[index]));
    }
    return _resolveInputPromises(inputs, promises);
  }

  function loadTableInput(_KDB, input) {
    const entry = _readTableEntry(_KDB, input);
    const rowsPromise = entry && entry.lifecycle === "ready" && entry.freshness === "fresh" ? Promise.resolve(entry.sourceRows || entry.rows) : _startTableLoad(_KDB, input, false);
    return rowsPromise.then(function (rows) {
      return _shapeTableRows(rows, input.shape, input.pick);
    });
  }

  return loadTableInputs;
});

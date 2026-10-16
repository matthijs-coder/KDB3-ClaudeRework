define([
  "./readTableEntry.js",
  "./resolveInputResults.js",
  "./shapeTableRows.js",
], function (_readTableEntry, _resolveInputResults, _shapeTableRows) {
  "use strict";

  function readRowsInputs(_KDB, inputs) {
    const results = [];
    for (let index = 0; index < inputs.length; index += 1) {
      results.push(readRowsInput(_KDB, inputs[index]));
    }
    return _resolveInputResults(inputs, results);
  }

  function readRowsInput(_KDB, input) {
    const entry = _readTableEntry(_KDB, input);
    return entry && entry.lifecycle === "ready" ? _shapeTableRows(entry.sourceRows || entry.rows, input.shape, input.pick) : undefined;
  }

  return readRowsInputs;
});

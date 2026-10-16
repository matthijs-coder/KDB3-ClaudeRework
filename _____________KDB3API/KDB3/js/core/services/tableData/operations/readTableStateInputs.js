define([
  "./readTableEntry.js",
  "./resolveInputResults.js",
], function (_readTableEntry, _resolveInputResults) {
  "use strict";

  function readTableStateInputs(_KDB, inputs) {
    const results = [];
    for (let index = 0; index < inputs.length; index += 1) {
      results.push(_readTableEntry(_KDB, inputs[index]));
    }
    return _resolveInputResults(inputs, results);
  }

  return readTableStateInputs;
});

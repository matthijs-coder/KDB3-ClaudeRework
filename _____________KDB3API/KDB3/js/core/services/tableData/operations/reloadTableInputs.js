define([
  "./resolveInputPromises.js",
  "./startTableLoad.js",
  "./shapeTableRows.js",
], function (_resolveInputPromises, _startTableLoad, _shapeTableRows) {
  "use strict";

  function reloadTableInputs(_KDB, inputs) {
    const promises = [];
    for (let index = 0; index < inputs.length; index += 1) {
      promises.push(reloadTableInput(_KDB, inputs[index]));
    }
    return _resolveInputPromises(inputs, promises);
  }

  function reloadTableInput(_KDB, input) {
    return _startTableLoad(_KDB, input, true).then(function (rows) {
      return _shapeTableRows(rows, input.shape, input.pick);
    });
  }

  return reloadTableInputs;
});

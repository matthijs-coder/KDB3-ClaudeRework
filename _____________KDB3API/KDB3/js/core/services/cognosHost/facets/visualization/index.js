define([
  "./read.js",
  "./selections.js",
  "./properties.js",
  "./slots.js",
  "./localFilters.js"
], function (_createReadOps, _selections, _createPropertyOps, _createSlotOps, _createLocalFilterOps) {
  "use strict";

  // The visualization facet of the cognosHost service (16 ops): reads, selections, vis properties,
  // slot writes and local filters. Built once; every op closes over the same ctx.
  function createVisualizationAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return Object.assign(
      {},
      _createReadOps(ctx),
      _selections.createSelectionOps(ctx),
      _createPropertyOps(ctx),
      _createSlotOps(ctx),
      _createLocalFilterOps(ctx)
    );
  }

  return createVisualizationAdapter;
});

define([
  "./rows.js",
  "./waitForQueryResult.js"
], function (_rows, _waitForQueryResult) {
  "use strict";

  // The dataQuery facet of the cognosHost service. waitForQueryResult is the cheap poll
  // (items.length > 0); readQueryRows waits, then flattens, so owners must not call it when they
  // only need the wait. peekQueryRows is sync and in-memory; wait and read stay async.
  function createDataQueryAdapter(_ctx) {
    return {
      waitForQueryResult: _waitForQueryResult.bind(null, _ctx),
      readQueryRows: _rows.readQueryRows.bind(null, _ctx),
      peekQueryRows: _rows.peekQueryRows.bind(null, _ctx)
    };
  }

  return createDataQueryAdapter;
});

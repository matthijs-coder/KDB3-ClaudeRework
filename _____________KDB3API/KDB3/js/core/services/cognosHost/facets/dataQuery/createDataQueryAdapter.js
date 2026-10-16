define(["./read/readQueryRows.js", "./wait/waitForQueryResult.js", "./read/peekQueryRows.js"], function (
  _readQueryRows,
  _waitForQueryResult,
  _peekQueryRows
) {
  "use strict";

  // The dataQuery facet of the cognosHost service. Named with the Adapter
  // suffix that naming.mdc prescribes for host adapters; "facet" is the
  // architectural term for a domain-scoped part of the ring-1 adapter.
  // waitForQueryResult is the cheap poll (items.length > 0). readQueryRows
  // waits, then flattens — owners must not call readQueryRows when they only
  // need the wait (that was a slice-4 mistake in waitForTableQueryResult).
  // peekQueryRows is sync in-memory; wait and read stay async.
  function createDataQueryAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return {
      waitForQueryResult: _waitForQueryResult.bind(null, ctx),
      readQueryRows: _readQueryRows.bind(null, ctx),
      peekQueryRows: _peekQueryRows.bind(null, ctx)
    };
  }

  return createDataQueryAdapter;
});

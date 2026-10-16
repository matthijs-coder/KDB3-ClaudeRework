define(["./read/hasErrorDataSource.js"], function (_hasErrorDataSource) {
  "use strict";

  // The dataSources facet of the cognosHost service. Named with the Adapter
  // suffix that naming.mdc prescribes for host adapters; "facet" is the
  // architectural term for a domain-scoped part of the ring-1 adapter.
  function createDataSourcesAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return {
      hasErrorDataSource: _hasErrorDataSource.bind(null, ctx)
    };
  }

  return createDataSourcesAdapter;
});

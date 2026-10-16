define([
  "./buildFilterReadSurface.js",
  "./buildFilterWriteSurface.js",
  "./wait/waitForPageContextReady.js"
], function (_buildFilterReadSurface, _buildFilterWriteSurface, _waitForPageContextReady) {
  "use strict";

  // The filters facet of the cognosHost service. Named with the Adapter suffix
  // that naming.mdc prescribes for host adapters; "facet" is the architectural
  // term for a domain-scoped part of the ring-1 adapter.
  //
  // removeFilter (host "delete") and clearAllPageContext are deliberately absent:
  // zero callers today, see contract decision D4(a).
  function createFiltersAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return Object.assign(
      {},
      _buildFilterReadSurface(ctx),
      _buildFilterWriteSurface(ctx),
      { waitForPageContextReady: _waitForPageContextReady.bind(null, ctx) }
    );
  }

  return createFiltersAdapter;
});

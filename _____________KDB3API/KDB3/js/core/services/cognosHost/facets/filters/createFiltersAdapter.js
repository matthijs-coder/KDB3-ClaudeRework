define([
  "./read.js",
  "./write.js",
  "./waitForPageContextReady.js"
], function (_read, _write, _waitForPageContextReady) {
  "use strict";

  // The filters facet of the cognosHost service.
  //
  // removeFilter (host "delete") and clearAllPageContext are deliberately absent:
  // zero callers today, see contract decision D4(a).
  function createFiltersAdapter(_ctx) {
    return {
      listFilterItems: _read.listFilterItems.bind(null, _ctx),
      findFilterItem: _read.findFilterItem.bind(null, _ctx),
      readFilterValues: _read.readFilterValues.bind(null, _ctx),
      listPageContextScopes: _read.listPageContextScopes.bind(null, _ctx),
      writeFilter: _write.writeFilter.bind(null, _ctx),
      clearFilter: _write.clearFilter.bind(null, _ctx),
      waitForPageContextReady: _waitForPageContextReady.bind(null, _ctx)
    };
  }

  return createFiltersAdapter;
});

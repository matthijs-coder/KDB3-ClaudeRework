define([
  "./read/listFilterItems.js",
  "./read/findFilterItem.js",
  "./read/readFilterValues.js",
  "./read/listPageContextScopes.js"
], function (_listFilterItems, _findFilterItem, _readFilterValues, _listPageContextScopes) {
  "use strict";

  // Operations are bound to the facet context with .bind, the same shape the
  // tabs adapter uses, so no function is defined inside the entry function.
  function __controller(_ctx) {
    return {
      listFilterItems: _listFilterItems.bind(null, _ctx),
      findFilterItem: _findFilterItem.bind(null, _ctx),
      readFilterValues: _readFilterValues.bind(null, _ctx),
      listPageContextScopes: _listPageContextScopes.bind(null, _ctx)
    };
  }

  return __controller;
});

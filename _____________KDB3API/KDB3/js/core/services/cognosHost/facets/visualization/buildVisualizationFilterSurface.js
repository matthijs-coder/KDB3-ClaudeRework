define([
  "./write/clearAllLocalFilters.js",
  "./write/addOrReplaceLocalFilter.js",
  "./write/removeLocalFilter.js"
], function (_clearAllLocalFilters, _addOrReplaceLocalFilter, _removeLocalFilter) {
  "use strict";

  function __controller(_ctx) {
    return {
      clearAllLocalFilters: _clearAllLocalFilters.bind(null, _ctx),
      addOrReplaceLocalFilter: _addOrReplaceLocalFilter.bind(null, _ctx),
      removeLocalFilter: _removeLocalFilter.bind(null, _ctx)
    };
  }

  return __controller;
});

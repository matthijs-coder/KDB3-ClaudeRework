define([
  "./write/writeFilter.js",
  "./write/clearFilter.js"
], function (_writeFilter, _clearFilter) {
  "use strict";

  function __controller(_ctx) {
    return {
      writeFilter: _writeFilter.bind(null, _ctx),
      clearFilter: _clearFilter.bind(null, _ctx)
    };
  }

  return __controller;
});

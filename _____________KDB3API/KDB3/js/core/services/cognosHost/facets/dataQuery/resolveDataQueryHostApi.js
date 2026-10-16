define([], function () {
  "use strict";

  // The dataQuery facet's single reach into _KDB.cognosAPI.dataQuery.
  // Resolved per call (and per poll tick), never captured: cluster A nulls
  // _KDB.cognosAPI on teardown.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.dataQuery || null;
  }

  return __controller;
});

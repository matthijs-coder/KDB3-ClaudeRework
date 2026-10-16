define([], function () {
  "use strict";

  // The dataSources facet's single reach into _KDB.cognosAPI.dataSources.
  // Resolved per call, never captured: cluster A nulls _KDB.cognosAPI on
  // teardown.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.dataSources || null;
  }

  return __controller;
});

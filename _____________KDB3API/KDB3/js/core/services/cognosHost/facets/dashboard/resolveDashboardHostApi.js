define([], function () {
  "use strict";

  // The dashboard facet's single reach into _KDB.cognosAPI.dashboard.
  // Resolved per call, never captured: cluster A nulls _KDB.cognosAPI on
  // teardown.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.dashboard || null;
  }

  return __controller;
});

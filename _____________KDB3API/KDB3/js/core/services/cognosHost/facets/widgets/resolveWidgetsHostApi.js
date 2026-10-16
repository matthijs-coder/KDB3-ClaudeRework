define([], function () {
  "use strict";

  // The single place in ring 1 that reaches for _KDB.cognosAPI.widgets. It is
  // resolved per call and never captured: the teardown invariant of cluster A
  // nulls _KDB.cognosAPI, so a captured reference would outlive the host.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.widgets || null;
  }

  return __controller;
});

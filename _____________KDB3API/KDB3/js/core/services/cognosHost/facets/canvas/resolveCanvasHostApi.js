define([], function () {
  "use strict";

  // The single place in ring 1 that reaches for _KDB.cognosAPI.canvas. Resolved
  // per call and never captured (cluster A teardown nulls _KDB.cognosAPI).
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.canvas || null;
  }

  return __controller;
});

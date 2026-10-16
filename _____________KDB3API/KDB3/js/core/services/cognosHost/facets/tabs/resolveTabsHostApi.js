define([], function () {
  "use strict";

  // The tabs facet's single reach into _KDB.cognosAPI.tabs. Callers bind the
  // return value as tabsApi. Resolved per call, never captured: cluster A
  // nulls _KDB.cognosAPI on teardown. Canvas flatten keeps its own copy so
  // listCanvasWidgets does not depend on this facet (contract D5).
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.tabs || null;
  }

  return __controller;
});

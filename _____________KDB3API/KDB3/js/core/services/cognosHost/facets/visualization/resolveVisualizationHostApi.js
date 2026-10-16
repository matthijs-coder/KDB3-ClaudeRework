define([], function () {
  "use strict";

  // The visualization facet's single reach into _KDB.cognosAPI.visualization.
  // Canvas D5 flatten keeps its own copy so listCanvasWidgets does not depend
  // on this facet (contract D5). Resolved per call, never captured.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.visualization || null;
  }

  return __controller;
});

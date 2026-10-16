define([], function () {
  "use strict";

  // Visualization SDK is read only inside ring 1 so listCanvasWidgets can fill
  // visType/visTitle (design doc section 3.3) without building the
  // visualization facet (slice 3).
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.visualization || null;
  }

  return __controller;
});

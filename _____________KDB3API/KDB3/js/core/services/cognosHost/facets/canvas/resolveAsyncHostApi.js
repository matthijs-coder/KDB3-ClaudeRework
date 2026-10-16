define([], function () {
  "use strict";

  // Canvas wait ops (whenRenderStart / whenRenderComplete / whenCanvasReady /
  // whenWidgetReady) reach the host async theme here.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.async || null;
  }

  return __controller;
});

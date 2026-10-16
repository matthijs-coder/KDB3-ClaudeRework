define([], function () {
  "use strict";

  function __controller(_status, _plan, _diagnostics) {
    var mirrorPatch = null;
    if (_status === "success" && _plan && _plan.mirrorPatch) {
      mirrorPatch = _plan.mirrorPatch;
    }
    return {
      status: _status,
      mirrorPatch: mirrorPatch,
      diagnostics: _diagnostics || {},
    };
  }

  return __controller;
});

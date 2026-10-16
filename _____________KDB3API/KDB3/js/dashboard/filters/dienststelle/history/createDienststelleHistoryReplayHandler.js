define(["./applyDienststelleHistoryReplay.js"], function (_applyReplay) {
  "use strict";

  function applyDienststelleReplay(_KDBArg, _targetValue, _step, _ctx) {
    var step = _step || {};
    if (step.key !== "filter_dienststelle") {
      return false;
    }
    return _applyReplay.apply(_KDBArg, _targetValue, _step, _ctx);
  }

  function createDienststelleHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: applyDienststelleReplay
    };
  }

  return createDienststelleHistoryReplayHandler;
});

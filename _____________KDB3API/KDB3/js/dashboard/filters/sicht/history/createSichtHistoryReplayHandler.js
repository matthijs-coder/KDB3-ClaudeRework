define(["./applySichtHistoryReplay.js"], function (_applyReplay) {
  "use strict";

  function createSichtHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: function (_KDBArg, _targetValue, _step, _ctx) {
        var step = _step || {};
        if (step.key !== "filter_sicht") {
          return false;
        }
        return _applyReplay.apply(_KDBArg, _targetValue, _step, _ctx);
      }
    };
  }

  return createSichtHistoryReplayHandler;
});

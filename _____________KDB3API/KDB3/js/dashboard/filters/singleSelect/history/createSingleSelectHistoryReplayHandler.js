define(["./applySingleSelectHistoryReplay.js"], function (_applyReplay) {
  "use strict";

  function createSingleSelectHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: function (_KDBArg, _targetValue, _step, _ctx) {
        var step = _step || {};
        if (step.key !== "filter_singleSelect") {
          return false;
        }
        return _applyReplay(_KDBArg, {
          targetValue: _targetValue || {},
          step: step,
          direction: _ctx && _ctx.direction
        });
      }
    };
  }

  return createSingleSelectHistoryReplayHandler;
});

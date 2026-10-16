define(["./applyHeaderHistoryReplay"], function (_applyReplay) {
  "use strict";

  function createHeaderHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: function (_KDBArg, _targetValue, _step, _ctx) {
        var step = _step || {};
        if (step.key !== "header_chromeChange" && step.key !== "header_textChange") {
          return false;
        }
        var targetValue = _targetValue || {};
        return _applyReplay(_KDBArg, {
          target: targetValue.target,
          value: targetValue.value,
          direction: _ctx && _ctx.direction,
          step: step,
        });
      },
    };
  }

  return createHeaderHistoryReplayHandler;
});

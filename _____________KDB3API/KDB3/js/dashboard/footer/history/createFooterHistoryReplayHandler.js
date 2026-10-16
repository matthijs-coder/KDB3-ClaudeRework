define(["./applyFooterHistoryReplay"], function (_applyReplay) {
  "use strict";

  function createFooterHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: function (_KDBArg, _targetValue, _step, _ctx) {
        var targetValue = _targetValue || {};
        return _applyReplay(_KDBArg, {
          target: targetValue.target,
          value: targetValue.value,
          direction: _ctx && _ctx.direction,
          step: _step || null,
        });
      },
    };
  }

  return createFooterHistoryReplayHandler;
});

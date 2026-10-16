define(["./applyControlSettingsHistoryReplay"], function (_applyReplay) {
  "use strict";

  function createKdbControlHistoryReplayHandler(_KDB, _applySettingsAction) {
    if (typeof _applySettingsAction !== "function") {
      return null;
    }
    return {
      apply: function (_KDBArg, _targetValue, _step, _ctx) {
        void _ctx;
        var targetValue = _targetValue || {};
        return _applyReplay(_KDB || _KDBArg, _applySettingsAction, {
          target: targetValue.target,
          value: targetValue.value,
          direction: _ctx && _ctx.direction,
          step: _step || null,
        });
      },
    };
  }

  return createKdbControlHistoryReplayHandler;
});

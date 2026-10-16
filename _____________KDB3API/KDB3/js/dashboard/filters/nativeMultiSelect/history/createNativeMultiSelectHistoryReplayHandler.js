define(["./applyNativeMultiSelectHistoryReplay.js"], function (_applyReplay) {
  "use strict";

  function applyNativeMultiSelectReplay(_KDBArg, _targetValue, _step, _ctx) {
    var step = _step || {};
    if (step.key !== "filter_nativeMultiSelect") {
      return false;
    }
    return _applyReplay.apply(_KDBArg, _targetValue, _step, _ctx);
  }

  function createNativeMultiSelectHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: applyNativeMultiSelectReplay
    };
  }

  return createNativeMultiSelectHistoryReplayHandler;
});

define([], function () {
  "use strict";

  async function apply(_KDB, _targetValue, _step, _ctx) {
    var step = _step || {};
    var result;
    void _ctx;
    try {
      if (step.key !== "filter_nativeMultiSelect") {
        return false;
      }
      if (!_KDB || !_KDB.api || !_KDB.api.nativeMultiSelect || typeof _KDB.api.nativeMultiSelect.dispatch !== "function") {
        return false;
      }
      result = await _KDB.api.nativeMultiSelect.dispatch({
        type: "nativeMultiSelect/historyReplayRequested",
        payload: {
          targetValue: _targetValue,
          step: _step,
          isHistoryReplay: true,
          skipHistory: true
        }
      });
      return result === true;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return false;
      }
      console.error("[nativeMultiSelect.applyNativeMultiSelectHistoryReplay] failed", err);
      return false;
    }
  }

  return { apply: apply };
});

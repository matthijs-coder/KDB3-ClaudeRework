define([], function () {
  "use strict";

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  }

  async function apply(_KDB, _targetValue, _step, _ctx) {
    var step = _step || {};
    var targetValue = _targetValue || {};
    var tabIndex;
    var targetPosition;
    var result;
    void _ctx;
    try {
      if (step.key !== "tabs_move") {
        return false;
      }
      if (!_KDB || !_KDB.api || !_KDB.api.tabs || typeof _KDB.api.tabs.dispatch !== "function") {
        return false;
      }
      tabIndex = targetValue.tabIndex;
      targetPosition = targetValue.targetPosition;
      if (typeof tabIndex !== "number" || !isFinite(tabIndex) || typeof targetPosition !== "number" || !isFinite(targetPosition)) {
        return false;
      }
      var movePayload = {
        tabIndex: tabIndex,
        targetPosition: targetPosition,
        isHistoryReplay: true,
        source: "historyReplay"
      };
      if (isPlainObject(targetValue.serializedByTabId)) {
        movePayload.serializedByTabId = targetValue.serializedByTabId;
      }
      result = await _KDB.api.tabs.dispatch({
        type: "tabs/move",
        payload: movePayload
      });
      return !!(result && (result.outcome === "applied" || result.outcome === "degraded"));
    } catch (err) {
      if (err && err.name === "AbortError") {
        return false;
      }
      console.error("[tabs.applyTabsMoveHistoryReplay] failed", err);
      return false;
    }
  }

  return { apply: apply };
});

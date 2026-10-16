define(["../../core/utils/kit/history.js", "./state/selectors.js"], function (_kitHistory, _selectors) {
  "use strict";

  var TARGET_STATUS = "footer.status";
  var STEP_KEY = "footer_chromeChange";
  var REPLAY_OPTIONS = { skipHistory: true, isHistoryReplay: true, forceApply: true };

  function readStatusSnapshot(_state) {
    return { target: TARGET_STATUS, value: _state.status === "active" ? "active" : "removed" };
  }

  function pushFooterHistoryStep(_KDB, _action, _prevState, _nextState, _options) {
    var payload = (_action && _action.payload) || {};
    if (payload.source === "bootstrap" || !_prevState || !_nextState) return;
    _kitHistory.pushHistoryStep(
      _KDB,
      { key: STEP_KEY, timestamp: Date.now(), old: readStatusSnapshot(_prevState), new: readStatusSnapshot(_nextState) },
      _options
    );
  }

  function isStepTargetConsistent(_step) {
    if (!_step) return true;
    var oldTarget = _step.old && _step.old.target;
    var newTarget = _step.new && _step.new.target;
    if (_step.old && _step.new && oldTarget !== newTarget) return false;
    return (!oldTarget || oldTarget === TARGET_STATUS) && (!newTarget || newTarget === TARGET_STATUS);
  }

  function applyFooterReplay(_KDB, _targetValue, _step) {
    var targetValue = _targetValue || {};
    var target = typeof targetValue.target === "string" ? targetValue.target.trim() : "";
    var value = targetValue.value;
    if (target !== TARGET_STATUS || typeof value !== "string" || value === "idle") return false;
    if (!isStepTargetConsistent(_step)) return false;
    if (value === "active" && _selectors.readHeaderStatus(_KDB) !== "active") {
      console.warn("[footer.historyReplay] cannot activate footer while header is not active");
      return false;
    }
    var type = value === "active" ? "footer/show" : value === "removed" ? "footer/hide" : null;
    var api = _KDB.api && _KDB.api.footer;
    if (!type || !api) return false;
    return api.dispatch({ type: type, payload: { source: "api" }, options: REPLAY_OPTIONS }) === true;
  }

  function createFooterReplayHandler() {
    var applyByKey = {};
    applyByKey[STEP_KEY] = applyFooterReplay;
    return _kitHistory.createReplayHandler(applyByKey);
  }

  return {
    pushFooterHistoryStep: pushFooterHistoryStep,
    createFooterReplayHandler: createFooterReplayHandler
  };
});

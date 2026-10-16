define(["../../core/utils/kit/history.js"], function (_kitHistory) {
  "use strict";

  var TARGET_STATUS = "header.status";
  var TARGET_SUBTITLE_STATUS = "header.subtitleStatus";
  var TARGET_TITLE_TEXT = "header.titleText";
  var TARGET_SUBTITLE_TEXT = "header.subtitleText";

  var STEP_KEY_CHROME = "header_chromeChange";
  var STEP_KEY_TEXT = "header_textChange";
  var STEP_KEY_BY_TARGET = {};
  STEP_KEY_BY_TARGET[TARGET_STATUS] = STEP_KEY_CHROME;
  STEP_KEY_BY_TARGET[TARGET_SUBTITLE_STATUS] = STEP_KEY_CHROME;
  STEP_KEY_BY_TARGET[TARGET_TITLE_TEXT] = STEP_KEY_TEXT;
  STEP_KEY_BY_TARGET[TARGET_SUBTITLE_TEXT] = STEP_KEY_TEXT;

  var TARGET_BY_ACTION_TYPE = {
    "header/commitTitle": TARGET_TITLE_TEXT,
    "header/commitSubtitle": TARGET_SUBTITLE_TEXT,
    "header/toggle": TARGET_STATUS,
    "header/show": TARGET_STATUS,
    "header/hide": TARGET_STATUS,
    "header/toggleSubtitle": TARGET_SUBTITLE_STATUS
  };

  var REPLAY_OPTIONS = { skipHistory: true, isHistoryReplay: true, forceApply: true };

  function isTrackedTarget(_target) {
    return Object.prototype.hasOwnProperty.call(STEP_KEY_BY_TARGET, _target);
  }

  function readSnapshot(_state, _target) {
    var subtitleStatus = _state.subtitleStatus === "active" || _state.subtitleStatus === "visible" ? "active" : "removed";
    var subtitleText = _state.subtitleText == null ? "" : String(_state.subtitleText);
    switch (_target) {
      case TARGET_TITLE_TEXT:
        return { target: _target, value: { titleText: _state.titleText == null ? "" : String(_state.titleText) } };
      case TARGET_SUBTITLE_TEXT:
        return { target: _target, value: { subtitleText: subtitleText, subtitleStatus: subtitleStatus } };
      case TARGET_STATUS:
        return { target: _target, value: _state.status === "active" ? "active" : "removed" };
      case TARGET_SUBTITLE_STATUS:
        return {
          target: _target,
          value: { status: _state.status || "idle", subtitleStatus: subtitleStatus, subtitleText: subtitleText }
        };
      default:
        return null;
    }
  }

  function pushHeaderHistoryStep(_KDB, _action, _prevState, _nextState, _options) {
    var target = _action && TARGET_BY_ACTION_TYPE[_action.type];
    if (!target || !_prevState || !_nextState) return;
    var oldSnapshot = readSnapshot(_prevState, target);
    var newSnapshot = readSnapshot(_nextState, target);
    if (!oldSnapshot || !newSnapshot) return;
    _kitHistory.pushHistoryStep(
      _KDB,
      { key: STEP_KEY_BY_TARGET[target], timestamp: Date.now(), old: oldSnapshot, new: newSnapshot },
      _options
    );
  }

  function buildReplayAction(_target, _value) {
    var payload = { source: "api" };
    switch (_target) {
      case TARGET_STATUS:
        if (_value === "active") return { type: "header/show", payload: payload, options: REPLAY_OPTIONS };
        if (_value === "removed") return { type: "header/hide", payload: payload, options: REPLAY_OPTIONS };
        return null;
      case TARGET_SUBTITLE_STATUS:
        if (!_value || typeof _value !== "object" || _value.status !== "active") return null;
        payload.subtitleStatus = _value.subtitleStatus;
        payload.subtitleText = _value.subtitleText;
        return { type: "header/setSubtitleChrome", payload: payload, options: REPLAY_OPTIONS };
      case TARGET_TITLE_TEXT:
        if (!_value || typeof _value !== "object" || typeof _value.titleText !== "string") return null;
        payload.titleText = _value.titleText;
        return { type: "header/setTitleText", payload: payload, options: REPLAY_OPTIONS };
      case TARGET_SUBTITLE_TEXT:
        if (!_value || typeof _value !== "object" || typeof _value.subtitleText !== "string") return null;
        if (_value.subtitleStatus !== "active" && _value.subtitleStatus !== "removed") return null;
        payload.subtitleText = _value.subtitleText;
        payload.subtitleStatus = _value.subtitleStatus;
        return { type: "header/setSubtitleText", payload: payload, options: REPLAY_OPTIONS };
      default:
        return null;
    }
  }

  function isStepTargetConsistent(_step, _target) {
    if (!_step) return true;
    var oldTarget = _step.old && _step.old.target;
    var newTarget = _step.new && _step.new.target;
    if (_step.old && _step.new && oldTarget !== newTarget) return false;
    return (!oldTarget || oldTarget === _target) && (!newTarget || newTarget === _target);
  }

  function applyHeaderReplay(_KDB, _targetValue, _step) {
    var targetValue = _targetValue || {};
    var target = typeof targetValue.target === "string" ? targetValue.target.trim() : "";
    var value = targetValue.value;
    if (!target || !isTrackedTarget(target)) return false;
    if (target === TARGET_STATUS && value === "idle") return false;
    if (!isStepTargetConsistent(_step, target)) return false;
    var action = buildReplayAction(target, value);
    var api = _KDB.api && _KDB.api.header;
    if (!action || !api) return false;
    return api.dispatch(action) === true;
  }

  function createHeaderReplayHandler() {
    var applyByKey = {};
    applyByKey[STEP_KEY_CHROME] = applyHeaderReplay;
    applyByKey[STEP_KEY_TEXT] = applyHeaderReplay;
    return _kitHistory.createReplayHandler(applyByKey);
  }

  return {
    pushHeaderHistoryStep: pushHeaderHistoryStep,
    createHeaderReplayHandler: createHeaderReplayHandler
  };
});

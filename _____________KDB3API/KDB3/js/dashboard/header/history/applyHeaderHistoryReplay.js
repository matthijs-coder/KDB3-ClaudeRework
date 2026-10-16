define([], function () {
  "use strict";

  var REPLAY_OPTIONS = { skipHistory: true, isHistoryReplay: true, forceApply: true };

  function isChromeHistoryTarget(target) {
    return target === "header.status" || target === "header.subtitleStatus";
  }
  function isTextHistoryTarget(target) {
    return target === "header.titleText" || target === "header.subtitleText";
  }
  function isHeaderHistoryTarget(target) {
    return isChromeHistoryTarget(target) || isTextHistoryTarget(target);
  }
  function buildReplayAction(_target, _value) {
    if (_target === "header.status") {
      if (_value === "active") {
        return { type: "header/show", payload: { source: "api" }, options: REPLAY_OPTIONS };
      }
      if (_value === "removed") {
        return { type: "header/hide", payload: { source: "api" }, options: REPLAY_OPTIONS };
      }
      return null;
    }
    if (_target === "header.subtitleStatus") {
      if (!_value || typeof _value !== "object" || _value.status !== "active") {
        return null;
      }
      return {
        type: "header/setSubtitleChrome",
        payload: {
          source: "api",
          subtitleStatus: _value.subtitleStatus,
          subtitleText: _value.subtitleText,
        },
        options: REPLAY_OPTIONS,
      };
    }
    if (_target === "header.titleText") {
      if (!_value || typeof _value !== "object" || typeof _value.titleText !== "string") {
        return null;
      }
      return {
        type: "header/setTitleText",
        payload: { source: "api", titleText: _value.titleText },
        options: REPLAY_OPTIONS,
      };
    }
    if (_target === "header.subtitleText") {
      if (!_value || typeof _value !== "object" || typeof _value.subtitleText !== "string") {
        return null;
      }
      if (_value.subtitleStatus !== "active" && _value.subtitleStatus !== "removed") {
        return null;
      }
      return {
        type: "header/setSubtitleText",
        payload: {
          source: "api",
          subtitleText: _value.subtitleText,
          subtitleStatus: _value.subtitleStatus,
        },
        options: REPLAY_OPTIONS,
      };
    }
    return null;
  }

  function applyHeaderHistoryReplay(_KDB, _payload) {
    var payload = _payload || {};
    var target = typeof payload.target === "string" ? payload.target.trim() : "";
    var value = payload.value;
    var step = payload.step || null;
    if (!target || !isHeaderHistoryTarget(target)) {
      return false;
    }
    if (target === "header.status" && value === "idle") {
      return false;
    }
    if (step && step.old && step.new && step.old.target !== step.new.target) {
      return false;
    }
    if (step && step.old && step.old.target && step.old.target !== target) {
      return false;
    }
    if (step && step.new && step.new.target && step.new.target !== target) {
      return false;
    }
    var replayAction = buildReplayAction(target, value);
    if (!replayAction) {
      return false;
    }
    var api = _KDB.api && _KDB.api.header;
    if (!api || typeof api.dispatch !== "function") {
      return false;
    }
    return api.dispatch(replayAction) === true;
  }

  return applyHeaderHistoryReplay;
});

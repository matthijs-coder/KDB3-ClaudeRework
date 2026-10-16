define(["./isHistoryTrackedSettingsTarget"], function (_isTracked) {
  "use strict";

  function cloneSerializable(_value) {
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_error) {
      return _value;
    }
  }

  function buildControlSettingsHistoryStep(_target, _oldValue, _newValue) {
    var target = String(_target || "").trim();
    if (!target || !_isTracked(target)) {
      return null;
    }
    return {
      key: "kdbControl_settingsChange",
      timestamp: Date.now(),
      old: { target: target, value: cloneSerializable(_oldValue) },
      new: { target: target, value: cloneSerializable(_newValue) },
    };
  }

  return buildControlSettingsHistoryStep;
});

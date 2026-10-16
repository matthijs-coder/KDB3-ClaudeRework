define([], function () {
  "use strict";

  function cloneSerializable(_value) {
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_error) {
      return _value;
    }
  }

  function warnHistoryServiceMissingOnce(_KDB) {
    const rt = _KDB.runtime && _KDB.runtime.widgetSettings;
    if (!rt || rt.historyServiceMissingWarned === true) {
      return;
    }
    rt.historyServiceMissingWarned = true;
    console.warn("[widgetSettings] _KDB.services.history is not available; option history commits are skipped.");
  }

  function pushWidgetSettingsHistoryStep(_KDB, _oldFrame, _newFrame, _options) {
    try {
      const options = _options || {};
      if (options.isHistoryReplay === true) {
        return false;
      }
      if (!_oldFrame || !_newFrame) {
        return false;
      }
      const history = _KDB.services && _KDB.services.history;
      if (!history || typeof history.pushCommittedStep !== "function") {
        warnHistoryServiceMissingOnce(_KDB);
        return false;
      }
      return history.pushCommittedStep({
        key: "widgetSettings_optionSelect",
        timestamp: Date.now(),
        old: cloneSerializable(_oldFrame),
        new: cloneSerializable(_newFrame)
      }) === true;
    } catch (err) {
      console.error("[widgetSettings.pushWidgetSettingsHistoryStep] failed", err);
      return false;
    }
  }

  return pushWidgetSettingsHistoryStep;
});

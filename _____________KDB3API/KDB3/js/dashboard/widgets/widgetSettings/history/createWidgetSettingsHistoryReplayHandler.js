define([
  "./applyWidgetSettingsOptionHistoryReplay.js"
], function (_applyReplay) {
  "use strict";

  function applyWidgetSettingsHistoryReplayStep(_KDBArg, _targetValue, _step, _ctx) {
    const step = _step || {};
    if (step.key !== "widgetSettings_optionSelect") {
      return false;
    }
    void _ctx;
    return _applyReplay(_KDBArg, {
      targetValue: _targetValue || null,
      step: step
    });
  }

  function createWidgetSettingsHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: applyWidgetSettingsHistoryReplayStep
    };
  }

  return createWidgetSettingsHistoryReplayHandler;
});

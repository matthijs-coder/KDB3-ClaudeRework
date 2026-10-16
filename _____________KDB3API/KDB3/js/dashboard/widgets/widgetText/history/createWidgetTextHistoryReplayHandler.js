define([
  "./applyWidgetTextHistoryReplay.js"
], function (_applyReplay) {
  function applyWidgetTextHistoryReplayStep(_KDB, _targetValue, _step, _ctx) {
    var step = _step || {};
    if (step.key !== "widget_textEdit") {
      return false;
    }
    void _ctx;
    return _applyReplay(_KDB, {
      targetValue: _targetValue || null,
      step: step
    });
  }

  function createWidgetTextHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: applyWidgetTextHistoryReplayStep
    };
  }

  return createWidgetTextHistoryReplayHandler;
});

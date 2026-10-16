define([
  "./applyWidgetBaseCanvasDropHistoryReplay.js",
  "./applyWidgetBaseLayoutHistoryReplay.js",
  "./applyWidgetBaseLaunchpadTransferHistoryReplay.js"
], function (_applyCanvasDropReplay, _applyLayoutReplay, _applyLaunchpadTransferReplay) {
  "use strict";

  var LAYOUT_REPLAY_KEYS = {
    widget_layoutMove: true,
    widget_layoutResize: true
  };

  function applyWidgetBaseHistoryReplayStep(_KDBArg, _targetValue, _step, _ctx) {
    const step = _step || {};
    if (step.key === "widget_canvasDrop") {
      return _applyCanvasDropReplay(_KDBArg, {
        targetValue: _targetValue || null,
        step: step,
        direction: _ctx && _ctx.direction
      });
    }
    if (step.key === "widget_launchpadTransfer") {
      return _applyLaunchpadTransferReplay(_KDBArg, {
        targetValue: _targetValue || null,
        step: step,
        direction: _ctx && _ctx.direction
      });
    }
    if (LAYOUT_REPLAY_KEYS[step.key] === true) {
      return _applyLayoutReplay(_KDBArg, {
        targetValue: _targetValue || null,
        step: step,
        direction: _ctx && _ctx.direction
      });
    }
    return false;
  }

  function createWidgetBaseHistoryReplayHandler(_KDB) {
    void _KDB;
    return { apply: applyWidgetBaseHistoryReplayStep };
  }

  return createWidgetBaseHistoryReplayHandler;
});

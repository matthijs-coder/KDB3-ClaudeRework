define([
  "./dispatchWidgetBaseReplay.js",
  "../state/isNumericLayout.js"
], function (_dispatchReplay, _isNumericLayout) {
  "use strict";

  var ACTION_BY_KEY = {
    widget_layoutMove: "widgetBase/move",
    widget_layoutResize: "widgetBase/resize"
  };

  async function applyWidgetBaseLayoutHistoryReplay(_KDB, _payload) {
    var payload = _payload || {};
    var step = payload.step || {};
    var actionType = ACTION_BY_KEY[step.key];
    if (!actionType) {
      return false;
    }
    var targetValue = payload.targetValue || {};
    var widgetId = targetValue.widgetId;
    if (!widgetId) {
      return false;
    }
    var toLayout = readLayoutFrame(targetValue);
    if (!toLayout) {
      return false;
    }
    return _dispatchReplay.dispatchWidgetBaseReplay(_KDB, {
      type: actionType,
      widgetId: widgetId,
      payload: {
        fromLayout: toLayout,
        toLayout: toLayout,
        isFinal: true,
        isHistoryReplay: true,
        reason: "historyReplay"
      }
    });
  }

  function readLayoutFrame(frame) {
    if (!_isNumericLayout(frame)) {
      return null;
    }
    return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
  }

  return applyWidgetBaseLayoutHistoryReplay;
});

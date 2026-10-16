define(["./dispatchWidgetBaseReplay.js"], function (_dispatchReplay) {
  "use strict";

  async function applyWidgetBaseCanvasDropHistoryReplay(_KDB, _payload) {
    const payload = _payload || {};
    const step = payload.step || {};
    const direction = payload.direction;
    const targetValue = payload.targetValue;

    if (step.key !== "widget_canvasDrop") {
      return false;
    }
    if (direction === "undo") {
      return dispatchUndo(_KDB, targetValue, step);
    }
    if (direction === "redo") {
      return dispatchRedo(_KDB, targetValue);
    }
    return false;
  }

  function dispatchUndo(_KDB, targetValue, step) {
    const fallback = step && step.new ? step.new : {};
    const target = targetValue || {};
    const widgetId = target.widgetId || fallback.widgetId;
    if (!widgetId) {
      return false;
    }
    return _dispatchReplay.dispatchWidgetBaseReplay(_KDB, {
      type: "widgetBase/routeToLaunchpad",
      widgetId: widgetId,
      payload: {
        reason: "historyReplay",
        isHistoryReplay: true,
        targetPad: target.launchpadPad || fallback.launchpadPad || null,
        tabId: target.tabId || fallback.tabId || null
      }
    });
  }

  function dispatchRedo(_KDB, targetValue) {
    const target = targetValue || {};
    if (!target.widgetId || !target.layout || !target.dropboxId) {
      return false;
    }
    return _dispatchReplay.dispatchWidgetBaseReplay(_KDB, {
      type: "widgetBase/takeFromLaunchpad",
      widgetId: target.widgetId,
      payload: {
        targetLayout: target.layout,
        dropboxId: target.dropboxId,
        tabId: target.tabId || null,
        reason: "historyReplay",
        isHistoryReplay: true
      }
    });
  }

  return applyWidgetBaseCanvasDropHistoryReplay;
});

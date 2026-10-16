define(["./delegateLaunchpadTransferSettingsReplay.js", "./resolveCanvasLayoutFromFrame.js", "./dispatchWidgetBaseReplay.js"], function (_settingsDelegation, _layoutFrame, _dispatchReplay) {
  "use strict";

  async function applyWidgetBaseLaunchpadTransferHistoryReplay(_KDB, _payload) {
    const payload = _payload || {};
    const step = payload.step || {};
    const direction = payload.direction;
    if (step.key !== "widget_launchpadTransfer") {
      return false;
    }
    if (direction === "undo") {
      return dispatchUndo(_KDB, payload.targetValue, step);
    }
    if (direction === "redo") {
      return dispatchRedo(_KDB, payload.targetValue, step);
    }
    return false;
  }

  function dispatchUndo(_KDB, targetValue, step) {
    const oldFrame = targetValue || step.old || {};
    const newFrame = step.new || {};
    const widgetId = oldFrame.widgetId || newFrame.widgetId;
    if (!widgetId) {
      return false;
    }
    if (newFrame.placement === "inLaunchpad") {
      return restoreCanvasPlacement(_KDB, widgetId, oldFrame).then(function (ok) {
        if (!ok || !_settingsDelegation.shouldDelegateSettings(oldFrame, newFrame)) {
          return ok;
        }
        return _settingsDelegation.delegatePlaceControls(_KDB, widgetId, oldFrame);
      });
    }
    if (newFrame.placement === "onCanvas" || _layoutFrame.hasLayout(newFrame)) {
      return parkInLaunchpad(_KDB, widgetId, oldFrame, newFrame);
    }
    return false;
  }

  function dispatchRedo(_KDB, targetValue, step) {
    const newFrame = targetValue || step.new || {};
    const oldFrame = step.old || {};
    const widgetId = newFrame.widgetId || oldFrame.widgetId;
    if (!widgetId) {
      return false;
    }
    if (newFrame.placement === "inLaunchpad") {
      return parkInLaunchpad(_KDB, widgetId, oldFrame, newFrame).then(function (ok) {
        if (!ok || !_settingsDelegation.shouldDelegateSettings(oldFrame, newFrame)) {
          return ok;
        }
        return _settingsDelegation.delegateCleanupControls(_KDB, widgetId);
      });
    }
    if (newFrame.placement === "onCanvas" || _layoutFrame.hasLayout(newFrame)) {
      return restoreCanvasPlacement(_KDB, widgetId, oldFrame);
    }
    return false;
  }

  function restoreCanvasPlacement(_KDB, widgetId, oldFrame) {
    const layout = _layoutFrame.resolveCanvasLayoutFromFrame(oldFrame);
    if (!layout) {
      return Promise.resolve(false);
    }
    return _dispatchReplay.dispatchWidgetBaseReplay(_KDB, {
      type: "widgetBase/takeFromLaunchpad",
      widgetId: widgetId,
      payload: {
        targetLayout: layout,
        tabId: oldFrame.tabId || null,
        reason: "historyReplay",
        isHistoryReplay: true
      }
    });
  }

  function parkInLaunchpad(_KDB, widgetId, oldFrame, launchpadFrame) {
    const frame = launchpadFrame.placement === "inLaunchpad" ? launchpadFrame : oldFrame;
    return _dispatchReplay.dispatchWidgetBaseReplay(_KDB, {
      type: "widgetBase/routeToLaunchpad",
      widgetId: widgetId,
      payload: {
        reason: "historyReplay",
        isHistoryReplay: true,
        requestedBy: frame.requestedBy || null,
        targetPad: frame.launchpadPad || null,
        tabId: frame.tabId || null,
        widgetType: mapKindToWidgetType(frame.kind),
        isTextWidget: frame.kind === "text",
        isLiveWidget: frame.kind === "vis"
      }
    });
  }

  function mapKindToWidgetType(kind) {
    if (kind === "text") {
      return "WIDGET.TEXT";
    }
    if (kind === "vis") {
      return "WIDGET.VISUALIZATION";
    }
    return null;
  }

  return applyWidgetBaseLaunchpadTransferHistoryReplay;
});

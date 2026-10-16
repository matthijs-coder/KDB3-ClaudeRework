define([
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/history.js",
  "./state.js",
  "./effects.js",
  "./view/resolveWidgetShell.js",
  "./interaction/pointerGeometry.js"
], function (_data, _historyKit, _state, _effects, _shellModule, _pointerGeometry) {
  "use strict";

  const hasLayout = _state.isNumericLayout;

  function resolveCanvasLayoutFromFrame(frame) {
    const value = frame || {};
    if (hasLayout(value.lastCanvasLayout)) {
      return value.lastCanvasLayout;
    }
    return hasLayout(value.layout) ? value.layout : null;
  }

  function mergeDomLayoutIntoFrame(_KDB, frame, shellEl) {
    if (!frame) {
      return null;
    }
    const merged = Object.assign({}, frame);
    if (frame.placement !== "onCanvas" || !shellEl) {
      return merged;
    }
    const domLayout = _pointerGeometry.readWidgetLayoutFromDom(_KDB, shellEl);
    if (!domLayout) {
      return merged;
    }
    merged.layout = domLayout;
    merged.lastCanvasLayout = domLayout;
    return merged;
  }

  function buildTransferHistoryOldFrame(widgetId, frame, payload) {
    const old = { widgetId: widgetId, placement: frame ? frame.placement : null };
    if (frame) {
      ["layout", "lastCanvasLayout", "tabId", "tabHandle", "kind", "role"].forEach(function (key) {
        if (frame[key] != null) {
          old[key] = _data.cloneJson(frame[key]);
        }
      });
    }
    if (payload && payload.requestedBy) {
      old.requestedBy = payload.requestedBy;
    }
    return old;
  }

  function buildTransferHistoryNewFrame(widgetId, frame, route, slotMeta, payload) {
    const newFrame = {
      widgetId: widgetId,
      placement: "inLaunchpad",
      launchpadPad: route.launchpadPad,
      launchpadSlotKey: slotMeta.slotKey,
      tabId: route.tabId,
      layout: null
    };
    if (frame) {
      if (frame.kind != null) {
        newFrame.kind = frame.kind;
      }
      if (frame.role != null) {
        newFrame.role = frame.role;
      }
      if (frame.lastCanvasLayout != null) {
        newFrame.lastCanvasLayout = _data.cloneJson(frame.lastCanvasLayout);
      }
    }
    if (payload && payload.requestedBy) {
      newFrame.requestedBy = payload.requestedBy;
    }
    return newFrame;
  }

  function dispatchModuleReplay(_KDB, moduleKey, action) {
    const api = _KDB && _KDB.api ? _KDB.api[moduleKey] : null;
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve(false);
    }
    return Promise.resolve(api.dispatch(action)).then(function (result) {
      return result && result.ok === true;
    });
  }

  function dispatchWidgetBaseReplay(_KDB, action) {
    return dispatchModuleReplay(_KDB, "widgetBase", action);
  }

  function dispatchWidgetSettingsReplay(_KDB, action) {
    return dispatchModuleReplay(_KDB, "widgetSettings", action);
  }

  async function replayCanvasDrop(_KDB, payload) {
    const step = payload.step;
    const target = payload.targetValue || {};
    if (payload.direction === "undo") {
      const fallback = step.new || {};
      const widgetId = target.widgetId || fallback.widgetId;
      if (!widgetId) {
        return false;
      }
      return dispatchWidgetBaseReplay(_KDB, {
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
    if (payload.direction === "redo") {
      if (!target.widgetId || !target.layout || !target.dropboxId) {
        return false;
      }
      return dispatchWidgetBaseReplay(_KDB, {
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
    return false;
  }

  function shouldDelegateSettings(oldFrame, newFrame) {
    return (oldFrame || {}).requestedBy === "widgetSettings" || (newFrame || {}).requestedBy === "widgetSettings";
  }

  function reassertCanvasLayout(_KDB, widgetId, frame) {
    const layout = resolveCanvasLayoutFromFrame(frame);
    if (!layout) {
      return Promise.resolve(true);
    }
    return Promise.resolve(_effects.applyWidgetLayout(_KDB, widgetId, layout)).then(function (result) {
      return result && result.ok === true;
    });
  }

  function delegatePlaceControls(_KDB, widgetId, frame) {
    const kind = (frame || {}).kind;
    if (kind !== "text" && kind !== "vis") {
      return Promise.resolve(false);
    }
    const shellEl = _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (!shellEl) {
      return Promise.resolve(false);
    }
    return _effects.dispatchWidgetSettingsPlaceControls(_KDB, {
      widgetId: widgetId,
      kind: kind,
      shellEl: shellEl,
      layout: resolveCanvasLayoutFromFrame(frame),
      isHistoryReplay: true,
      source: "historyReplay"
    }).then(function (placeOk) {
      if (!placeOk) {
        return false;
      }
      return dispatchWidgetSettingsReplay(_KDB, {
        type: "widgetSettings/restoreCommittedSettings",
        widgetId: widgetId,
        payload: { widgetId: widgetId, kind: kind, isHistoryReplay: true, source: "historyReplay" }
      }).then(function () {
        return reassertCanvasLayout(_KDB, widgetId, frame);
      });
    });
  }

  function delegateCleanupControls(_KDB, widgetId) {
    return dispatchWidgetSettingsReplay(_KDB, {
      type: "widgetSettings/cleanupWidgetControls",
      widgetId: widgetId,
      payload: { widgetId: widgetId, reason: "settingsDelete", requestedBy: "widgetSettings", isHistoryReplay: true }
    });
  }

  function mapKindToWidgetType(kind) {
    if (kind === "text") {
      return "WIDGET.TEXT";
    }
    return kind === "vis" ? "WIDGET.VISUALIZATION" : null;
  }

  function restoreCanvasPlacement(_KDB, widgetId, oldFrame) {
    const layout = resolveCanvasLayoutFromFrame(oldFrame);
    if (!layout) {
      return Promise.resolve(false);
    }
    return dispatchWidgetBaseReplay(_KDB, {
      type: "widgetBase/takeFromLaunchpad",
      widgetId: widgetId,
      payload: { targetLayout: layout, tabId: oldFrame.tabId || null, reason: "historyReplay", isHistoryReplay: true }
    });
  }

  function parkInLaunchpad(_KDB, widgetId, oldFrame, launchpadFrame) {
    const frame = launchpadFrame.placement === "inLaunchpad" ? launchpadFrame : oldFrame;
    return dispatchWidgetBaseReplay(_KDB, {
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

  function undoLaunchpadTransfer(_KDB, targetValue, step) {
    const oldFrame = targetValue || step.old || {};
    const newFrame = step.new || {};
    const widgetId = oldFrame.widgetId || newFrame.widgetId;
    if (!widgetId) {
      return false;
    }
    if (newFrame.placement === "inLaunchpad") {
      return restoreCanvasPlacement(_KDB, widgetId, oldFrame).then(function (ok) {
        return ok && shouldDelegateSettings(oldFrame, newFrame) ? delegatePlaceControls(_KDB, widgetId, oldFrame) : ok;
      });
    }
    if (newFrame.placement === "onCanvas" || hasLayout(newFrame)) {
      return parkInLaunchpad(_KDB, widgetId, oldFrame, newFrame);
    }
    return false;
  }

  function redoLaunchpadTransfer(_KDB, targetValue, step) {
    const newFrame = targetValue || step.new || {};
    const oldFrame = step.old || {};
    const widgetId = newFrame.widgetId || oldFrame.widgetId;
    if (!widgetId) {
      return false;
    }
    if (newFrame.placement === "inLaunchpad") {
      return parkInLaunchpad(_KDB, widgetId, oldFrame, newFrame).then(function (ok) {
        return ok && shouldDelegateSettings(oldFrame, newFrame) ? delegateCleanupControls(_KDB, widgetId) : ok;
      });
    }
    if (newFrame.placement === "onCanvas" || hasLayout(newFrame)) {
      return restoreCanvasPlacement(_KDB, widgetId, oldFrame);
    }
    return false;
  }

  async function replayLaunchpadTransfer(_KDB, payload) {
    if (payload.direction === "undo") {
      return undoLaunchpadTransfer(_KDB, payload.targetValue, payload.step);
    }
    return payload.direction === "redo" ? redoLaunchpadTransfer(_KDB, payload.targetValue, payload.step) : false;
  }

  const LAYOUT_ACTION_BY_KEY = {
    widget_layoutMove: "widgetBase/move",
    widget_layoutResize: "widgetBase/resize"
  };

  async function replayLayout(_KDB, payload) {
    const targetValue = payload.targetValue || {};
    if (!targetValue.widgetId || !hasLayout(targetValue)) {
      return false;
    }
    const toLayout = { x: targetValue.x, y: targetValue.y, width: targetValue.width, height: targetValue.height };
    return dispatchWidgetBaseReplay(_KDB, {
      type: LAYOUT_ACTION_BY_KEY[payload.step.key],
      widgetId: targetValue.widgetId,
      payload: { fromLayout: toLayout, toLayout: toLayout, isFinal: true, isHistoryReplay: true, reason: "historyReplay" }
    });
  }

  function adaptReplay(replay) {
    return function (_KDB, targetValue, step, ctx) {
      return replay(_KDB, { targetValue: targetValue || null, step: step || {}, direction: ctx && ctx.direction });
    };
  }

  function createWidgetBaseHistoryReplayHandler() {
    return _historyKit.createReplayHandler({
      widget_canvasDrop: adaptReplay(replayCanvasDrop),
      widget_launchpadTransfer: adaptReplay(replayLaunchpadTransfer),
      widget_layoutMove: adaptReplay(replayLayout),
      widget_layoutResize: adaptReplay(replayLayout)
    });
  }

  return {
    hasLayout: hasLayout,
    resolveCanvasLayoutFromFrame: resolveCanvasLayoutFromFrame,
    mergeDomLayoutIntoFrame: mergeDomLayoutIntoFrame,
    buildTransferHistoryOldFrame: buildTransferHistoryOldFrame,
    buildTransferHistoryNewFrame: buildTransferHistoryNewFrame,
    createWidgetBaseHistoryReplayHandler: createWidgetBaseHistoryReplayHandler
  };
});

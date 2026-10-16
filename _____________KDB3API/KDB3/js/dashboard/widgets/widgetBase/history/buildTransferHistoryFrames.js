define(["../state/cloneSerializable.js"], function (_cloneSerializable) {
  "use strict";

  function buildTransferHistoryOldFrame(widgetId, frame, payload) {
    const old = { widgetId: widgetId, placement: frame ? frame.placement : null };
    if (frame) {
      copyFrameFields(old, frame);
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
      layout: null,
    };
    if (frame) {
      if (frame.kind != null) {
        newFrame.kind = frame.kind;
      }
      if (frame.role != null) {
        newFrame.role = frame.role;
      }
      if (frame.lastCanvasLayout != null) {
        newFrame.lastCanvasLayout = _cloneSerializable(frame.lastCanvasLayout);
      }
    }
    if (payload && payload.requestedBy) {
      newFrame.requestedBy = payload.requestedBy;
    }
    return newFrame;
  }

  function copyFrameFields(target, frame) {
    const fields = ["layout", "lastCanvasLayout", "tabId", "tabHandle", "kind", "role"];
    let index = 0;
    while (index < fields.length) {
      const key = fields[index];
      if (frame[key] != null) {
        target[key] = _cloneSerializable(frame[key]);
      }
      index += 1;
    }
  }

  return {
    buildTransferHistoryOldFrame: buildTransferHistoryOldFrame,
    buildTransferHistoryNewFrame: buildTransferHistoryNewFrame,
  };
});

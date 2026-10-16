define([], function () {
  function buildHistoryFrame(frame) {
    return frame ? { widgetId: frame.widgetId, placement: frame.placement, layout: frame.layout, launchpadPad: frame.launchpadPad, launchpadSlotKey: frame.launchpadSlotKey, tabId: frame.tabId, kind: frame.kind } : null;
  }

  function buildDropHistoryFrame(widgetId, route, layout, dropRequest) {
    return { widgetId: widgetId, placement: "onCanvas", layout: layout, kind: route.kind, launchpadPad: route.launchpadPad, tabId: route.tabId, dropboxId: dropRequest.dropboxId || null, dropRequest: buildReplayDropRequest(dropRequest) };
  }

  function buildReplayDropRequest(dropRequest) {
    return { draggedElementType: dropRequest.draggedElementType || null, dropboxId: dropRequest.dropboxId || null, layout: dropRequest.layout || null, originId: dropRequest.originId || null, padKey: dropRequest.padKey || null, payload: dropRequest.payload || {}, sourceKind: dropRequest.sourceKind || "unknown", startedAt: dropRequest.startedAt || null, tabId: dropRequest.tabId || null };
  }

  function storeWidgetRuntime(_KDB, widgetId, shellEl, opSeq) {
    _KDB.runtime.widgetBase.byId = _KDB.runtime.widgetBase.byId || {};
    _KDB.runtime.widgetBase.byId[widgetId] = _KDB.runtime.widgetBase.byId[widgetId] || {};
    _KDB.runtime.widgetBase.byId[widgetId].domRefs = { shellEl: shellEl, canvasParentEl: shellEl.parentNode, launchpadSlotEl: null };
    _KDB.runtime.widgetBase.byId[widgetId].opSeq = opSeq;
  }

  return { buildHistoryFrame: buildHistoryFrame, buildDropHistoryFrame: buildDropHistoryFrame, storeWidgetRuntime: storeWidgetRuntime };
});

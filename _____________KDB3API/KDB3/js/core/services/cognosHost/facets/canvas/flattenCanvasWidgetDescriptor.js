define([
  "./readCanvasItemIdentity.js",
  "./readCanvasWidgetHostMeta.js"
], function (_readCanvasItemIdentity, _readCanvasWidgetHostMeta) {
  "use strict";

  // Host fields only. Owner policy (skipReason, route, helper-tabs, DOM TEXT)
  // stays in widgetBase. No kind field (E0.4).
  function flattenCanvasWidgetDescriptor(_KDB, _canvasItem) {
    var widgetId = _readCanvasItemIdentity.readWidgetId(_canvasItem);
    var contentType;
    var meta;
    if (!widgetId) {
      return null;
    }
    contentType = _readCanvasItemIdentity.readContentType(_canvasItem);
    meta = _readCanvasWidgetHostMeta(_KDB, widgetId);
    return {
      widgetId: widgetId,
      tabId: _readCanvasItemIdentity.readCanvasTabId(_KDB, _canvasItem),
      containerId: _readCanvasItemIdentity.readContainerId(_canvasItem),
      widgetType: meta.widgetType,
      contentType: contentType,
      isLiveWidget: contentType === "widget.live",
      visType: meta.visType,
      visTitle: meta.visTitle
    };
  }

  return flattenCanvasWidgetDescriptor;
});

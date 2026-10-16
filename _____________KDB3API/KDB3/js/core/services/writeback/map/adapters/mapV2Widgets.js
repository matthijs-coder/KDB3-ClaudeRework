define([
  "./mapV2WidgetEntry.js",
], function (_mapV2WidgetEntry) {
  "use strict";

  function mapV2Widgets(_payload, _diagnostics) {
    try {
      const widgetsObj = _payload.widgets;
      if (!widgetsObj || typeof widgetsObj !== "object") {
        return null;
      }
      const widgetIds = Object.keys(widgetsObj);
      const wgts = [];
      for (let index = 0; index < widgetIds.length; index += 1) {
        const widgetId = widgetIds[index];
        const mapped = _mapV2WidgetEntry(widgetsObj[widgetId], widgetId, _diagnostics);
        if (mapped) {
          wgts.push(mapped);
        }
      }
      return wgts.length > 0 ? wgts : null;
    } catch (error) {
      throw error;
    }
  }

  return mapV2Widgets;
});

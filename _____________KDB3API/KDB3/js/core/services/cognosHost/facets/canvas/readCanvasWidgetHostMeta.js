define([
  "../../hostAccess.js",
  "./resolveVisualizationHostApi.js"
], function (_hostAccess, _resolveVisualizationHostApi) {
  "use strict";

  function readWidgetType(_KDB, _widgetId) {
    var widgetsApi = _hostAccess.resolveHostApi(_KDB, "widgets");
    if (!widgetsApi || typeof widgetsApi.getType !== "function") {
      return null;
    }
    try {
      var widgetType = widgetsApi.getType(_widgetId);
      return widgetType == null || widgetType === "" ? null : String(widgetType);
    } catch (_err) {
      return null;
    }
  }

  function readVisType(_KDB, _widgetId) {
    var visualizationApi = _resolveVisualizationHostApi(_KDB);
    if (!visualizationApi || typeof visualizationApi.getVisType !== "function") {
      return null;
    }
    try {
      var visType = visualizationApi.getVisType(_widgetId);
      return visType == null || visType === "" ? null : String(visType);
    } catch (_err) {
      return null;
    }
  }

  function readVisTitle(_KDB, _widgetId) {
    var visualizationApi = _resolveVisualizationHostApi(_KDB);
    if (!visualizationApi || typeof visualizationApi.getVisTitle !== "function") {
      return null;
    }
    try {
      var visTitle = visualizationApi.getVisTitle(_widgetId);
      return visTitle == null || visTitle === "" ? null : String(visTitle);
    } catch (_err) {
      return null;
    }
  }

  function readCanvasWidgetHostMeta(_KDB, _widgetId) {
    return {
      widgetType: readWidgetType(_KDB, _widgetId),
      visType: readVisType(_KDB, _widgetId),
      visTitle: readVisTitle(_KDB, _widgetId)
    };
  }

  return readCanvasWidgetHostMeta;
});

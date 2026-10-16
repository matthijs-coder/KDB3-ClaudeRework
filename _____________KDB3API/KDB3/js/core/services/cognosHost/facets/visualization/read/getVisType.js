define([
  "../resolveVisualizationHostApi.js",
  "../buildVisualizationOutcome.js",
  "../config/visualizationErrorCodes.js"
], function (_resolveVisualizationHostApi, _buildVisualizationOutcome, _visualizationErrorCodes) {
  "use strict";

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function __controller(_ctx, _widgetId) {
    var visualizationApi;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    try {
      visualizationApi = _resolveVisualizationHostApi(_ctx._KDB);
      if (!visualizationApi) {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof visualizationApi.getVisType !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      return _buildVisualizationOutcome.buildOk(visualizationApi.getVisType(_widgetId));
    } catch (error) {
      console.error("[cognosHost.visualization.getVisType] failed", { widgetId: _widgetId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.READ_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.READ_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

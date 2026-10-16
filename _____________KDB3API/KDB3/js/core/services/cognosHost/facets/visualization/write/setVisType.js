define([
  "../resolveVisualizationHostApi.js",
  "../buildVisualizationOutcome.js",
  "../config/visualizationErrorCodes.js"
], function (_resolveVisualizationHostApi, _buildVisualizationOutcome, _visualizationErrorCodes) {
  "use strict";

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  async function __controller(_ctx, _widgetId, _visType, _options) {
    var visualizationApi;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildVisualizationOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId) || _visType == null || _visType === "") {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    try {
      visualizationApi = _resolveVisualizationHostApi(_ctx._KDB);
      if (!visualizationApi) {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof visualizationApi.setVisType !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      await Promise.resolve(visualizationApi.setVisType(_visType, _widgetId));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildVisualizationOutcome.buildAborted("aborted-after-effect");
      }
      return _buildVisualizationOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.visualization.setVisType] failed", { widgetId: _widgetId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.WRITE_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

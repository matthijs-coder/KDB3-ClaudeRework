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

  async function __controller(_ctx, _widgetId, _slotId, _columnId, _label, _options) {
    var visualizationApi;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildVisualizationOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId) || _slotId == null || _slotId === "" || _columnId == null || _columnId === "" || typeof _label !== "string" || _label === "") {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    try {
      visualizationApi = _resolveVisualizationHostApi(_ctx._KDB);
      if (!visualizationApi) {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof visualizationApi.setCustomLabel !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      await Promise.resolve(visualizationApi.setCustomLabel(_widgetId, _slotId, _columnId, _label));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildVisualizationOutcome.buildAborted("aborted-after-effect");
      }
      return _buildVisualizationOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.visualization.setCustomLabelInSlot] failed", { widgetId: _widgetId, slotId: _slotId }, error);
      if (error && error.message === "ITEM_NOT_FOUND") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.ITEM_NOT_FOUND, [
          _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.ITEM_NOT_FOUND, error && error.message)
        ]);
      } else if (error && error.message === "HOST_CAPABILITY_MISSING") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, [
          _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, error && error.message)
        ]);
      }
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.WRITE_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

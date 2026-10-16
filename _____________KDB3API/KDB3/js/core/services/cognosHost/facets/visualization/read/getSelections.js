define([
  "../../../hostAccess.js",
  "../flatten/flattenSelectionCategories.js",
  "../buildVisualizationOutcome.js",
  "../config/visualizationErrorCodes.js",
  "../readLastSelectionDto.js"
], function (
  _hostAccess,
  _flattenSelectionCategories,
  _buildVisualizationOutcome,
  _visualizationErrorCodes,
  _readLastSelectionDto
) {
  "use strict";

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function isThenable(_value) {
    return !!(_value && typeof _value.then === "function");
  }

  // Live PO: widgets.getContent is getCanvas().getContent and has no getSelections.
  // Legacy: getFeature("Canvas").getContent(id).getSelections() — inner ring getCanvasFeature().
  function resolveSelectionContent(_KDB, _widgetId) {
    var canvasApi;
    var canvasFeature;
    var canvasContent;
    var widgetsApi;
    var widgetsContent;
    canvasApi = _KDB && _KDB.cognosAPI && _KDB.cognosAPI.canvas;
    if (canvasApi && typeof canvasApi.getCanvasFeature === "function") {
      canvasFeature = canvasApi.getCanvasFeature();
      if (canvasFeature && typeof canvasFeature.getContent === "function") {
        canvasContent = canvasFeature.getContent(_widgetId);
      }
    }
    if (canvasContent && typeof canvasContent.getSelections === "function") {
      return canvasContent;
    }
    widgetsApi = _hostAccess.resolveHostApi(_KDB, "widgets");
    if (widgetsApi && typeof widgetsApi.getContent === "function") {
      widgetsContent = widgetsApi.getContent(_widgetId);
    }
    if (widgetsContent && typeof widgetsContent.getSelections === "function") {
      return widgetsContent;
    }
    return widgetsContent || canvasContent || null;
  }

  function __controller(_ctx, _widgetId) {
    var content;
    var hostResult;
    var categories;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    try {
      content = resolveSelectionContent(_ctx._KDB, _widgetId);
      if (!content || typeof content.getSelections !== "function") {
        return _buildVisualizationOutcome.buildOk(_readLastSelectionDto(_ctx, _widgetId));
      }
      hostResult = content.getSelections();
      if (isThenable(hostResult) || hostResult == null) {
        return _buildVisualizationOutcome.buildOk(_readLastSelectionDto(_ctx, _widgetId));
      }
      try {
        categories = _flattenSelectionCategories(hostResult);
      } catch (flattenError) {
        console.error("[cognosHost.visualization.getSelections] flatten failed", { widgetId: _widgetId }, flattenError);
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.READ_FAILED, [
          _buildVisualizationOutcome.buildDiagnostic(
            _visualizationErrorCodes.READ_FAILED,
            flattenError && flattenError.message ? flattenError.message : String(flattenError)
          )
        ]);
      }
      if (!categories || categories.length === 0) {
        return _buildVisualizationOutcome.buildOk(_readLastSelectionDto(_ctx, _widgetId));
      }
      return _buildVisualizationOutcome.buildOk({
        widgetId: _widgetId,
        categories: categories
      });
    } catch (error) {
      console.error("[cognosHost.visualization.getSelections] failed", { widgetId: _widgetId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.READ_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(
          _visualizationErrorCodes.READ_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return __controller;
});

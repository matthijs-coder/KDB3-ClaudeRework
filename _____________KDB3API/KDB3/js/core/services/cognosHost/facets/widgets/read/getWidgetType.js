define([
  "../resolveWidgetsHostApi.js",
  "../buildWidgetOutcome.js",
  "../config/widgetErrorCodes.js"
], function (_resolveWidgetsHostApi, _buildWidgetOutcome, _widgetErrorCodes) {
  "use strict";

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function __controller(_ctx, _widgetId) {
    var widgetsApi;
    var widgetType;
    if (_ctx.isDisposed()) {
      return _buildWidgetOutcome.buildDisposed();
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.INVALID_ID, []);
    }
    try {
      widgetsApi = _resolveWidgetsHostApi(_ctx._KDB);
      if (!widgetsApi) {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof widgetsApi.getType !== "function") {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      widgetType = widgetsApi.getType(_widgetId);
      return _buildWidgetOutcome.buildOk(widgetType == null ? null : String(widgetType));
    } catch (error) {
      console.error("[cognosHost.widgets.getWidgetType] failed", { widgetId: _widgetId }, error);
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.READ_FAILED, [
        _buildWidgetOutcome.buildDiagnostic(_widgetErrorCodes.READ_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

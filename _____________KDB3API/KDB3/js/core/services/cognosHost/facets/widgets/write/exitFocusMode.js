define([
  "../resolveWidgetsHostApi.js",
  "../buildWidgetOutcome.js",
  "../config/widgetErrorCodes.js"
], function (_resolveWidgetsHostApi, _buildWidgetOutcome, _widgetErrorCodes) {
  "use strict";

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  // Chrome-labelled. Same HOST_CAPABILITY_MISSING rule as enterFocusMode.
  function __controller(_ctx, _widgetId) {
    var widgetsApi;
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
      if (typeof widgetsApi.exitWidgetFocusMode !== "function") {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      if (widgetsApi.exitWidgetFocusMode(_widgetId) !== true) {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      return _buildWidgetOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.widgets.exitFocusMode] failed", { widgetId: _widgetId }, error);
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.WRITE_FAILED, [
        _buildWidgetOutcome.buildDiagnostic(_widgetErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

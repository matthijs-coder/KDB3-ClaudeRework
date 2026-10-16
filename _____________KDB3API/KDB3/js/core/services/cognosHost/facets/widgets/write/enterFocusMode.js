define([
  "../resolveWidgetsHostApi.js",
  "../buildWidgetOutcome.js",
  "../config/widgetErrorCodes.js"
], function (_resolveWidgetsHostApi, _buildWidgetOutcome, _widgetErrorCodes) {
  "use strict";

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  // Chrome-labelled: layer 1 clicks a catalog selector. Selector break or a
  // missing click target is HOST_CAPABILITY_MISSING, never a silent no-op.
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
      if (typeof widgetsApi.enterWidgetFocusMode !== "function") {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      if (widgetsApi.enterWidgetFocusMode(_widgetId) !== true) {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      return _buildWidgetOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.widgets.enterFocusMode] failed", { widgetId: _widgetId }, error);
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.WRITE_FAILED, [
        _buildWidgetOutcome.buildDiagnostic(_widgetErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

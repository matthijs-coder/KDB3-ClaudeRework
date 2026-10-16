define([
  "../resolveWidgetsHostApi.js",
  "../buildWidgetOutcome.js",
  "../config/widgetErrorCodes.js"
], function (_resolveWidgetsHostApi, _buildWidgetOutcome, _widgetErrorCodes) {
  "use strict";

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  // Equivalent of the previous owner check getContent(widgetId) != null.
  // Empty id is a normal "no" (ok + false), matching claimShellById's early null.
  function __controller(_ctx, _widgetId) {
    var widgetsApi;
    if (_ctx.isDisposed()) {
      return _buildWidgetOutcome.buildDisposed();
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildWidgetOutcome.buildOk(false);
    }
    try {
      widgetsApi = _resolveWidgetsHostApi(_ctx._KDB);
      if (!widgetsApi) {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof widgetsApi.getContent !== "function") {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      return _buildWidgetOutcome.buildOk(widgetsApi.getContent(_widgetId) != null);
    } catch (error) {
      console.error("[cognosHost.widgets.hasContent] failed", { widgetId: _widgetId }, error);
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.READ_FAILED, [
        _buildWidgetOutcome.buildDiagnostic(_widgetErrorCodes.READ_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

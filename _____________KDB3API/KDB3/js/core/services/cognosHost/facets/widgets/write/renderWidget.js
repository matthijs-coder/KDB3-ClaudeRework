define([
  "../resolveWidgetsHostApi.js",
  "../buildWidgetOutcome.js",
  "../config/widgetErrorCodes.js"
], function (_resolveWidgetsHostApi, _buildWidgetOutcome, _widgetErrorCodes) {
  "use strict";

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  async function __controller(_ctx, _widgetId, _options) {
    var widgetsApi;
    if (_ctx.isDisposed()) {
      return _buildWidgetOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildWidgetOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.INVALID_ID, []);
    }
    try {
      widgetsApi = _resolveWidgetsHostApi(_ctx._KDB);
      if (!widgetsApi) {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof widgetsApi.renderWidget !== "function") {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      await Promise.resolve(widgetsApi.renderWidget(_widgetId));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildWidgetOutcome.buildAborted("aborted-after-effect");
      }
      return _buildWidgetOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.widgets.renderWidget] failed", { widgetId: _widgetId }, error);
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.WRITE_FAILED, [
        _buildWidgetOutcome.buildDiagnostic(_widgetErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

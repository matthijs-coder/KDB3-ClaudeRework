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

  function isValidPropertyKey(_key) {
    return typeof _key === "string" && _key !== "";
  }

  // Live content is resolved per call and never returned. Callers that used to
  // skip silently when getContent was missing still get ITEM_NOT_FOUND here;
  // colour/font owners swallow that as they swallowed a boolean false.
  async function __controller(_ctx, _widgetId, _key, _value, _options) {
    var widgetsApi;
    var content;
    if (_ctx.isDisposed()) {
      return _buildWidgetOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildWidgetOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.INVALID_ID, []);
    }
    if (!isValidPropertyKey(_key)) {
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.INVALID_ID, []);
    }
    try {
      widgetsApi = _resolveWidgetsHostApi(_ctx._KDB);
      if (!widgetsApi) {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof widgetsApi.getContent !== "function") {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      content = widgetsApi.getContent(_widgetId);
      if (!content || typeof content.setPropertyValue !== "function") {
        return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.ITEM_NOT_FOUND, []);
      }
      await Promise.resolve(content.setPropertyValue(_key, _value));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildWidgetOutcome.buildAborted("aborted-after-effect");
      }
      return _buildWidgetOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.widgets.setWidgetProperty] failed", { widgetId: _widgetId, key: _key }, error);
      return _buildWidgetOutcome.buildFailed(_widgetErrorCodes.WRITE_FAILED, [
        _buildWidgetOutcome.buildDiagnostic(_widgetErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

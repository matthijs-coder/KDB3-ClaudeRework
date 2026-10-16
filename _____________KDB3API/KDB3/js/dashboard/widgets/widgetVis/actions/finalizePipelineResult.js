define([
  "../config/actionTypes.js",
  "./normalizeDispatchResult.js"
], function (_actionTypes, _normalizeDispatchResult) {
  "use strict";

  function finalizePipelineResult(_context, _action, _result, _options) {
    var options = _options || {};
    var defaultErrorCode = options.defaultErrorCode || "WIDGET_VIS_BINDING_APPLY_FAILED";
    var defaultErrorMessage = options.defaultErrorMessage || "Binding pipeline failed.";
    if (_result && _result.stale === true) {
      return _normalizeDispatchResult(_result);
    }
    if (_result && _result.ok === true) {
      _context.dispatchInternal({
        type: _actionTypes.APPLY_SUCCEEDED,
        widgetId: _action.widgetId,
        payload: { derived: _result.derived || {} }
      });
      var normalized = _normalizeDispatchResult(_result);
      if (typeof options.buildReportToSettings === "function") {
        normalized.reportToSettings = options.buildReportToSettings(_result);
      }
      return normalized;
    }
    _context.dispatchInternal({
      type: _actionTypes.ERROR_RECORDED,
      widgetId: _action.widgetId,
      payload: {
        errorCode: _result.errorCode || defaultErrorCode,
        errorMessage: _result.errorMessage || defaultErrorMessage
      }
    });
    return _normalizeDispatchResult(_result || { ok: false, errorCode: defaultErrorCode });
  }

  return finalizePipelineResult;
});

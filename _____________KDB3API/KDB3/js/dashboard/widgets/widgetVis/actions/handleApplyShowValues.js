define([
  "../effects/applyShowValues.js",
  "../config/visTypes/normalizeVisualizationType.js",
  "./normalizeDispatchResult.js"
], function (_applyShowValues, _normalizeVisualizationType, _normalizeDispatchResult) {
  "use strict";

  function failClosed(_action, _errorCode) {
    return _normalizeDispatchResult({
      ok: false,
      widgetId: _action && _action.widgetId,
      opSeq: _action && _action.opSeq,
      status: "error",
      errorCode: _errorCode
    });
  }

  function succeedShowValues(_action, _payload, _result) {
    return _normalizeDispatchResult({
      ok: true,
      widgetId: _action && _action.widgetId,
      opSeq: _action && _action.opSeq,
      status: "success",
      skipped: !!(_result && _result.skipped),
      reason: _result && _result.reason,
      reportToSettings: {
        control: "showValues",
        previousValue: _payload.previousValue,
        nextValue: _payload.nextValue
      }
    });
  }

  async function handleApplyShowValues(_context, _action) {
    try {
      var payload = (_action && _action.payload) || {};
      var widgetId = _action && _action.widgetId;
      var snapshot = payload.settingsSnapshot || {};
      var nextValue = payload.nextValue;
      var normalizedVisType = _normalizeVisualizationType(snapshot.visType) || snapshot.visType;
      var result;
      if (!_context.selectors.readVisRecord(_context._KDB, widgetId)) {
        return failClosed(_action, "WIDGET_VIS_CONTENT_CONTEXT_MISSING");
      }
      if ((typeof nextValue !== "boolean" && nextValue !== "inherit") || snapshot.visType === undefined) {
        return failClosed(_action, "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE");
      }
      result = await _applyShowValues.applyShowValues(
        _context._KDB,
        widgetId,
        nextValue,
        normalizedVisType
      );
      if (!result || result.ok !== true) {
        return failClosed(_action, result && result.errorCode ? result.errorCode : "WIDGET_VIS_FACET_MISSING");
      }
      return succeedShowValues(_action, payload, result);
    } catch (err) {
      console.error("[widgetVis.handleApplyShowValues]", err);
      return failClosed(_action, "WIDGET_VIS_FACET_MISSING");
    }
  }

  return handleApplyShowValues;
});

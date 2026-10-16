define([
  "../effects/applyIteratorZoom.js",
  "../config/visTypes/normalizeVisualizationType.js",
  "./normalizeDispatchResult.js"
], function (_applyIteratorZoom, _normalizeVisualizationType, _normalizeDispatchResult) {
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

  function succeedIteratorZoom(_action, _payload, _result) {
    var envelope = {
      ok: true,
      widgetId: _action && _action.widgetId,
      opSeq: _action && _action.opSeq,
      status: "success",
      skipped: !!(_result && _result.skipped),
      reason: _result && _result.reason
    };
    if (!envelope.skipped) {
      envelope.reportToSettings = {
        control: _payload.control,
        previousValue: _payload.previousValue,
        nextValue: _payload.nextValue
      };
    }
    return _normalizeDispatchResult(envelope);
  }

  function isIteratorZoomControl(_control) {
    return _control === "iterator" || _control === "zoom" || _control === "valueCaption";
  }

  async function handleApplyIteratorZoom(_context, _action) {
    try {
      var payload = (_action && _action.payload) || {};
      var widgetId = _action && _action.widgetId;
      var snapshot = payload.settingsSnapshot || {};
      var nextValue = payload.nextValue;
      var control = payload.control;
      var normalizedVisType = _normalizeVisualizationType(snapshot.visType) || snapshot.visType;
      var result;
      if (!_context.selectors.readVisRecord(_context._KDB, widgetId)) {
        return failClosed(_action, "WIDGET_VIS_CONTENT_CONTEXT_MISSING");
      }
      if (!isIteratorZoomControl(control) || (typeof nextValue !== "boolean" && nextValue !== "inherit") || snapshot.visType === undefined) {
        return failClosed(_action, "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE");
      }
      result = await _applyIteratorZoom.applyIteratorZoom(
        _context._KDB,
        widgetId,
        nextValue,
        normalizedVisType,
        control
      );
      if (!result || result.ok !== true) {
        return failClosed(_action, result && result.errorCode ? result.errorCode : "WIDGET_VIS_FACET_MISSING");
      }
      return succeedIteratorZoom(_action, payload, result);
    } catch (err) {
      console.error("[widgetVis.handleApplyIteratorZoom]", err);
      return failClosed(_action, "WIDGET_VIS_FACET_MISSING");
    }
  }

  return handleApplyIteratorZoom;
});

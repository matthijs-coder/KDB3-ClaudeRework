define(["./state.js"], function (_state) {
  "use strict";

  function normalizeDispatchResult(_result) {
    var result = _result || {};
    return {
      ok: result.ok === true,
      outcome: result.outcome,
      reason: result.reason,
      widgetId: result.widgetId,
      opSeq: result.opSeq,
      skipped: result.skipped === true,
      stale: result.stale === true,
      status: result.status || null,
      ready: result.ready === true,
      reportToSettings: result.reportToSettings,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      diagnostics: result.diagnostics
    };
  }

  function finalizePipelineResult(_context, _action, _result, _options) {
    var options = _options || {};
    var defaultErrorCode = options.defaultErrorCode || "WIDGET_VIS_BINDING_APPLY_FAILED";
    var defaultErrorMessage = options.defaultErrorMessage || "Binding pipeline failed.";
    if (_result && _result.stale === true) {
      return normalizeDispatchResult(_result);
    }
    if (_result && _result.ok === true) {
      _context.dispatchInternal({
        type: _state.ACTION_TYPES.APPLY_SUCCEEDED,
        widgetId: _action.widgetId,
        payload: { derived: _result.derived || {} }
      });
      var normalized = normalizeDispatchResult(_result);
      if (typeof options.buildReportToSettings === "function") {
        normalized.reportToSettings = options.buildReportToSettings(_result);
      }
      return normalized;
    }
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.ERROR_RECORDED,
      widgetId: _action.widgetId,
      payload: {
        errorCode: _result.errorCode || defaultErrorCode,
        errorMessage: _result.errorMessage || defaultErrorMessage
      }
    });
    return normalizeDispatchResult(_result || { ok: false, errorCode: defaultErrorCode });
  }

  function mergeDiagnostics(_applyDiagnostics, _propertyDiagnostics) {
    if (!_propertyDiagnostics) {
      return _applyDiagnostics || null;
    }
    return Object.assign({}, _applyDiagnostics || {}, {
      visualizationProperties: _propertyDiagnostics
    });
  }

  function reportApplyResult(_options) {
    var options = _options || {};
    var applyResult = options.applyResult || {};
    var payload = options.payload || {};
    var control = payload.control || options.control || null;
    var diagnostics = mergeDiagnostics(applyResult.diagnostics, options.propertyDiagnostics);
    if (applyResult.status === "success") {
      return {
        ok: true,
        widgetId: options.widgetId,
        opSeq: options.opSeq,
        status: "success",
        reportToSettings: {
          control: control,
          previousValue: payload.previousValue,
          nextValue: payload.nextValue,
          diagnostics: diagnostics
        },
        diagnostics: diagnostics
      };
    }
    if (applyResult.status === "aborted") {
      return { ok: false, widgetId: options.widgetId, opSeq: options.opSeq, stale: true, status: "aborted" };
    }
    if (applyResult.status === "timeout") {
      return {
        ok: false,
        widgetId: options.widgetId,
        opSeq: options.opSeq,
        status: "timeout",
        errorCode: "WIDGET_VIS_BINDING_TIMEOUT",
        errorMessage: applyResult.diagnostics && applyResult.diagnostics.errorMessage ? applyResult.diagnostics.errorMessage : "Binding apply timed out."
      };
    }
    return {
      ok: false,
      widgetId: options.widgetId,
      opSeq: options.opSeq,
      status: applyResult.status || "error",
      errorCode: applyResult.diagnostics && applyResult.diagnostics.errorCode ? applyResult.diagnostics.errorCode : "WIDGET_VIS_BINDING_APPLY_FAILED",
      errorMessage: applyResult.diagnostics && applyResult.diagnostics.errorMessage ? applyResult.diagnostics.errorMessage : "Binding apply failed."
    };
  }

  return {
    normalizeDispatchResult: normalizeDispatchResult,
    finalizePipelineResult: finalizePipelineResult,
    reportApplyResult: reportApplyResult
  };
});

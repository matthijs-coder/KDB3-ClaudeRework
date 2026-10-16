define([], function () {
  "use strict";

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

  return reportApplyResult;
});

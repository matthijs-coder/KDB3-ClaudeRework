define([], function () {
  "use strict";

  function createDiagnosticsBuilder(_target, _operation, _reason) {
    var target = _target || {};
    var startedAt = Date.now();
    var diagnostics = {
      service: "widgetBindingApply",
      operation: _operation || "applyBinding",
      targetWidgetId: target.widgetId || "",
      targetKind: target.targetKind || "vis",
      ownerWidgetId: target.ownerWidgetId != null ? target.ownerWidgetId : null,
      opSeq: target.opSeq != null ? target.opSeq : null,
      reason: _reason != null ? _reason : null,
      completedSteps: [],
      failedStep: null,
      skippedSteps: [],
      errorCode: null,
      errorMessage: null,
      emptyMode: null,
      emptyReason: null,
      elapsedMs: 0,
      renderWaitMs: 0,
      timedOut: false,
      aborted: false,
      warnings: [],
      cognos: {},
    };

    function addCompletedStep(_stepId) {
      if (_stepId && diagnostics.completedSteps.indexOf(_stepId) < 0) {
        diagnostics.completedSteps.push(_stepId);
      }
    }

    function setFailedStep(_stepId, _errorCode, _errorMessage) {
      diagnostics.failedStep = _stepId || null;
      diagnostics.errorCode = _errorCode || null;
      diagnostics.errorMessage = _errorMessage || null;
    }

    function addSkippedStep(_stepId) {
      if (_stepId && diagnostics.skippedSteps.indexOf(_stepId) < 0) {
        diagnostics.skippedSteps.push(_stepId);
      }
    }

    function addWarning(_code, _message, _step) {
      diagnostics.warnings.push({
        code: _code || "WIDGET_BINDING_APPLY_WARNING",
        message: _message || "",
        step: _step || undefined,
      });
    }

    function finishDiagnostics(_overrides) {
      diagnostics.elapsedMs = Date.now() - startedAt;
      if (_overrides && typeof _overrides === "object") {
        var keys = Object.keys(_overrides);
        for (var index = 0; index < keys.length; index += 1) {
          diagnostics[keys[index]] = _overrides[keys[index]];
        }
      }
      return diagnostics;
    }

    return {
      diagnostics: diagnostics,
      addCompletedStep: addCompletedStep,
      setFailedStep: setFailedStep,
      addSkippedStep: addSkippedStep,
      addWarning: addWarning,
      finishDiagnostics: finishDiagnostics,
    };
  }

  function __controller(_target, _operation, _reason) {
    return createDiagnosticsBuilder(_target, _operation, _reason);
  }

  return __controller;
});

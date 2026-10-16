define([], function () {
  "use strict";

  // Step outcome shared by the runner and every step:
  // { state: "completed" | "skipped" | "aborted" | "failed" | "timeout", step?, errorCode?, errorMessage?, renderWaitMs? }
  // `step` overrides the failed step id (render-wait failures are reported on waitRenderComplete).
  var COMPLETED = Object.freeze({ state: "completed" });
  var SKIPPED = Object.freeze({ state: "skipped" });
  var ABORTED = Object.freeze({ state: "aborted" });

  function failed(_errorCode, _errorMessage, _extra) {
    return Object.assign({ state: "failed", errorCode: _errorCode, errorMessage: _errorMessage }, _extra);
  }

  function formatErrorMessage(_err) {
    return String(_err && _err.message ? _err.message : _err);
  }

  function createDiagnostics(_target, _operation, _reason) {
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

    function addSkippedStep(_stepId) {
      if (_stepId && diagnostics.skippedSteps.indexOf(_stepId) < 0) {
        diagnostics.skippedSteps.push(_stepId);
      }
    }

    function setFailedStep(_stepId, _errorCode, _errorMessage) {
      diagnostics.failedStep = _stepId || null;
      diagnostics.errorCode = _errorCode || null;
      diagnostics.errorMessage = _errorMessage || null;
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
      return Object.assign(diagnostics, _overrides);
    }

    return {
      diagnostics: diagnostics,
      addCompletedStep: addCompletedStep,
      addSkippedStep: addSkippedStep,
      setFailedStep: setFailedStep,
      addWarning: addWarning,
      finishDiagnostics: finishDiagnostics,
    };
  }

  function createApplyResult(_status, _plan, _diagnostics) {
    return {
      status: _status,
      mirrorPatch: _status === "success" && _plan && _plan.mirrorPatch ? _plan.mirrorPatch : null,
      diagnostics: _diagnostics || {},
    };
  }

  function createAbortedResult(_plan, _diagnosticsBuilder) {
    var diagnostics = _diagnosticsBuilder.finishDiagnostics({ aborted: true, errorCode: "WIDGET_BINDING_APPLY_ABORTED" });
    return createApplyResult("aborted", _plan, diagnostics);
  }

  function isAbortedFacetOutcome(_outcome) {
    if (!_outcome) {
      return false;
    }
    if (_outcome.aborted === true || _outcome.outcome === "aborted") {
      return true;
    }
    return _outcome.ok === false && (
      _outcome.reason === "aborted" ||
      _outcome.reason === "aborted-after-effect" ||
      _outcome.reason === "disposed"
    );
  }

  function readFacetErrorMessage(_outcome) {
    var first = _outcome && _outcome.diagnostics && _outcome.diagnostics[0];
    if (first && first.message) {
      return String(first.message);
    }
    return _outcome && _outcome.errorCode ? String(_outcome.errorCode) : "Cognos host operation failed.";
  }

  // Maps a cognosHost Outcome to { ok, aborted?, data?, errorCode?, errorMessage? }.
  function mapFacetOutcome(_outcome) {
    if (isAbortedFacetOutcome(_outcome)) {
      return { ok: false, aborted: true };
    }
    if (!_outcome || _outcome.ok !== true) {
      return {
        ok: false,
        errorCode: (_outcome && _outcome.errorCode) || "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
        errorMessage: readFacetErrorMessage(_outcome),
      };
    }
    return { ok: true, data: _outcome.data };
  }

  // Step outcome for a mapped facet call that did not succeed; null when it succeeded.
  function facetStepFailure(_mapped, _defaultCode, _defaultMessage) {
    if (_mapped.aborted) {
      return ABORTED;
    }
    if (!_mapped.ok) {
      return failed(_mapped.errorCode || _defaultCode, _mapped.errorMessage || _defaultMessage);
    }
    return null;
  }

  return {
    COMPLETED: COMPLETED,
    SKIPPED: SKIPPED,
    ABORTED: ABORTED,
    failed: failed,
    formatErrorMessage: formatErrorMessage,
    createDiagnostics: createDiagnostics,
    createApplyResult: createApplyResult,
    createAbortedResult: createAbortedResult,
    mapFacetOutcome: mapFacetOutcome,
    facetStepFailure: facetStepFailure,
  };
});

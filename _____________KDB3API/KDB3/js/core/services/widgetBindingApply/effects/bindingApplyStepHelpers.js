define([
  "./buildAbortedApplyResult.js",
], function (_buildAbortedApplyResult) {
  "use strict";

  function formatErrorMessage(_err) {
    return String(_err && _err.message ? _err.message : _err);
  }

  function returnAbortedOutcome(_plan, _diagnosticsBuilder) {
    return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
  }

  function returnAbortedResultIfSignalled(_signal, _plan, _diagnosticsBuilder) {
    if (_signal && _signal.aborted) {
      return _buildAbortedApplyResult(_plan, _diagnosticsBuilder);
    }
    return null;
  }

  function returnAbortedIfSignalled(_signal, _plan, _diagnosticsBuilder) {
    if (_signal && _signal.aborted) {
      return returnAbortedOutcome(_plan, _diagnosticsBuilder);
    }
    return null;
  }

  function returnAbortedIfSignalledOrOutcome(_signal, _plan, _diagnosticsBuilder, _outcome) {
    if ((_outcome && _outcome.aborted) || (_signal && _signal.aborted)) {
      return returnAbortedOutcome(_plan, _diagnosticsBuilder);
    }
    return null;
  }

  function setStepFailure(_diagnosticsBuilder, _stepId, _errorCode, _err) {
    _diagnosticsBuilder.setFailedStep(_stepId, _errorCode, formatErrorMessage(_err));
  }

  function isAbortedFacetOutcome(_outcome) {
    if (!_outcome) {
      return false;
    }
    if (_outcome.aborted === true) {
      return true;
    }
    if (_outcome.outcome === "aborted") {
      return true;
    }
    return _outcome.ok === false && (
      _outcome.reason === "aborted" ||
      _outcome.reason === "aborted-after-effect" ||
      _outcome.reason === "disposed"
    );
  }

  function readFacetErrorMessage(_outcome) {
    var diagnostics = _outcome && _outcome.diagnostics;
    var first = diagnostics && diagnostics[0];
    if (first && first.message) {
      return String(first.message);
    }
    return _outcome && _outcome.errorCode ? String(_outcome.errorCode) : "Cognos host operation failed.";
  }

  function mapFacetOutcome(_outcome) {
    if (isAbortedFacetOutcome(_outcome)) {
      return { ok: false, aborted: true };
    }
    if (!_outcome || _outcome.ok !== true) {
      return {
        ok: false,
        errorCode: (_outcome && _outcome.errorCode) || "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
        errorMessage: readFacetErrorMessage(_outcome)
      };
    }
    return { ok: true, data: _outcome.data };
  }

  return {
    formatErrorMessage: formatErrorMessage,
    returnAbortedOutcome: returnAbortedOutcome,
    returnAbortedResultIfSignalled: returnAbortedResultIfSignalled,
    returnAbortedIfSignalled: returnAbortedIfSignalled,
    returnAbortedIfSignalledOrOutcome: returnAbortedIfSignalledOrOutcome,
    setStepFailure: setStepFailure,
    isAbortedFacetOutcome: isAbortedFacetOutcome,
    mapFacetOutcome: mapFacetOutcome,
  };
});

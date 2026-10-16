define([
  "./buildAbortedApplyResult.js",
  "./bindingApplyStepHelpers.js",
], function (_buildAbortedApplyResult, _bindingApplyStepHelpers) {
  "use strict";

  async function __controller(_signal, _plan, _diagnosticsBuilder, _stepId, _errorCode, _task) {
    var mapped;
    if (_signal && _signal.aborted) {
      return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
    }
    try {
      mapped = _bindingApplyStepHelpers.mapFacetOutcome(await Promise.resolve(_task()));
      if (mapped.aborted) {
        return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
      }
      if (!mapped.ok) {
        _bindingApplyStepHelpers.setStepFailure(
          _diagnosticsBuilder,
          _stepId,
          mapped.errorCode || _errorCode,
          mapped.errorMessage || _errorCode
        );
        return { ok: false };
      }
      _diagnosticsBuilder.addCompletedStep(_stepId);
      return { ok: true, data: mapped.data };
    } catch (err) {
      _bindingApplyStepHelpers.setStepFailure(_diagnosticsBuilder, _stepId, _errorCode, err);
      return { ok: false };
    }
  }

  return __controller;
});

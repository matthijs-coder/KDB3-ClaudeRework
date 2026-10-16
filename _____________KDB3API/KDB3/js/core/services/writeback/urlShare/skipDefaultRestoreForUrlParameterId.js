define([
  "./readUrlParameterId.js",
  "../set/state/createRunContext.js",
  "../schema/errorCodes.js",
  "../set/state/buildRestoreResult.js"
], function (_readUrlParameterId, _createRunContext, _errorCodes, _buildRestoreResult) {
  "use strict";

  // Only skip-path caller of readUrlParameterId (delta §3). Does not parse hash.
  function skipDefaultRestoreForUrlParameterId(_KDB, _input) {
    var input = _input && typeof _input === "object" ? _input : {};
    var parameterId;
    var run;
    try {
      if (input.activeRun) {
        return { kind: "throwOverlap" };
      }
      parameterId = _readUrlParameterId();
      if (parameterId == null) {
        return { kind: "proceed" };
      }
      run = _createRunContext(_KDB, input.rawStatus, input.statusKind, input.options);
      run.addDiagnostic(
        _errorCodes.codes.WRITEBACK_URL_PARAMETER_ID_PRECEDENCE,
        "set",
        "default restore skipped because URL parameterId is present",
        { parameterId: parameterId }
      );
      return {
        kind: "skipped",
        restoreResult: _buildRestoreResult.buildRestoreResult(run, "cancelled")
      };
    } catch (error) {
      console.error("[writebackSet.skipDefaultRestoreForUrlParameterId] failed", error);
      throw error;
    }
  }

  return skipDefaultRestoreForUrlParameterId;
});

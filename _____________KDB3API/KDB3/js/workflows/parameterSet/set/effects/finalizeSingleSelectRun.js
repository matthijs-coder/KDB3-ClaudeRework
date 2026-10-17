define([
  "../../../../core/config/writebackErrorCodes.js",
], function (_errorCodes) {
  "use strict";

  async function finalizeSingleSelectRun(_KDB, run, outcome) {
    const api = _KDB && _KDB.api ? _KDB.api.singleSelect : null;
    if (!api) {
      return [
        _errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
          "cleanup",
          "singleSelect parameterSetRunFinished could not be dispatched (API unavailable)",
          { owner: "singleSelect" },
          run.runId
        )
      ];
    }

    try {
      const finishResult = await api.dispatch({
        type: "singleSelect/parameterSetRunFinished",
        payload: {
          runId: run.runId,
          source: "writebackSet",
          outcome: mapRunFinishedOutcome(outcome)
        }
      });
      if (finishResult && finishResult.ok === true) {
        const alreadyReleased = finishResult.alreadyReleased === true;
        const cleanupDiagnostics = Array.isArray(finishResult.diagnostics)
          ? finishResult.diagnostics : [];
        if (cleanupDiagnostics.length === 0) {
          return [];
        }
        return cleanupDiagnostics.map(function (diagnostic) {
          return _errorCodes.makeDiagnostic(
            diagnostic.code || _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
            "cleanup",
            diagnostic.message || "singleSelect run finalization reported a diagnostic",
            Object.assign({}, diagnostic, { nonDegrading: alreadyReleased === true }),
            run.runId
          );
        });
      }
      const details = finishResult && Array.isArray(finishResult.diagnostics)
        ? finishResult.diagnostics
        : null;
      return [
        _errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
          "cleanup",
          "singleSelect parameterSetRunFinished rejected by owner",
          { ownerDiagnostics: details },
          run.runId
        )
      ];
    } catch (error) {
      return [
        _errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
          "cleanup",
          "singleSelect parameterSetRunFinished dispatch failed: " +
            (error && error.message ? error.message : String(error)),
          null,
          run.runId
        )
      ];
    }
  }

  function mapRunFinishedOutcome(outcome) {
    if (outcome === "committed" || outcome === "degraded") {
      return "success";
    }
    if (outcome === "cancelled") {
      return "cancelled";
    }
    if (outcome === "abortedByOwner") {
      return "abortedByOwner";
    }
    return "failure";
  }

  return finalizeSingleSelectRun;
});

define([
  "../../schema/errorCodes.js",
], function (_errorCodes) {
  "use strict";

  // History begin/finish guards per contracts/writeback.md §6 step 6/29 and
  // contracts/historyService-writebackRestore-contractdelta.md. Guard failures
  // land both in the phase entry and in the top-level diagnostics array,
  // matching the owner-dispatch phases.

  function historyBeginGuarded(_KDB, run) {
    const history = _KDB && _KDB.services ? _KDB.services.history : null;
    if (!history || typeof history.beginWritebackRestore !== "function") {
      // historyService writeback delta not registered: record explicitly
      // instead of silently continuing without a guard (fail closed).
      recordHistoryGuardFailure(run, "historyBegin",
        "history.beginWritebackRestore is not available (history writeback delta not implemented)");
      return false;
    }
    try {
      history.beginWritebackRestore({ source: "writebackSet", runId: run.runId, status: run.status });
      run.recordPhase("historyBegin", null, true);
      return true;
    } catch (error) {
      recordHistoryGuardFailure(run, "historyBegin",
        "history.beginWritebackRestore failed: " + (error && error.message ? error.message : String(error)));
      return false;
    }
  }

  function historyFinishGuarded(_KDB, run, outcome, baseline) {
    const history = _KDB && _KDB.services ? _KDB.services.history : null;
    if (!history || typeof history.finishWritebackRestore !== "function") {
      recordHistoryGuardFailure(run, "historyFinish",
        "history.finishWritebackRestore is not available (history writeback delta not implemented)");
      return;
    }
    try {
      const payload = { source: "writebackSet", runId: run.runId, outcome: outcome };
      if (baseline) {
        payload.baseline = baseline;
      }
      history.finishWritebackRestore(payload);
      run.recordPhase("historyFinish", null, true);
    } catch (error) {
      recordHistoryGuardFailure(run, "historyFinish",
        "history.finishWritebackRestore failed: " + (error && error.message ? error.message : String(error)));
    }
  }

  function recordHistoryGuardFailure(run, phaseName, message) {
    const diagnostic = _errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_HISTORY_GUARD_FAILED, "restore", message, {}, run.runId
    );
    run.recordPhase(phaseName, null, false, false, [diagnostic]);
    run.diagnostics.push(diagnostic);
  }

  return Object.freeze({
    historyBeginGuarded: historyBeginGuarded,
    historyFinishGuarded: historyFinishGuarded,
  });
});

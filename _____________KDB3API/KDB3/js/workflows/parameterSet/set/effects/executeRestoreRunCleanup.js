define([
  "../../schema/errorCodes.js",
  "./runGuards.js",
  "../state/ensureWritebackRuntime.js",
  "./finalizeSingleSelectRun.js",
  "./restoreAbortActiveTab.js"
], function (
  _errorCodes,
  _runGuards,
  _ensureWritebackRuntime,
  _finalizeSingleSelectRun,
  _restoreAbortActiveTab
) {
  "use strict";

  function isNonDegradingCleanupDiagnostic(diagnostic) {
    if (!diagnostic || typeof diagnostic !== "object") return false;
    if (diagnostic.details && diagnostic.details.nonDegrading === true) return true;
    const code = diagnostic.code != null ? String(diagnostic.code) : "";
    const message = diagnostic.message != null ? String(diagnostic.message).toLowerCase() : "";
    if (code.toLowerCase().indexOf("already_released") !== -1) return true;
    return message.indexOf("already released") !== -1;
  }

  async function finishRestoreRun(_KDB, run, outcome, baseline, historyBegun, loadingStarted) {
    const cleanupDiagnostics = [];
    let cleanupDegraded = false;
    if (historyBegun) {
      try {
        _runGuards.historyFinishGuarded(_KDB, run, outcome, baseline);
      } catch (historyError) {
        cleanupDiagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_HISTORY_GUARD_FAILED,
          "cleanup",
          "history finish guard failed: " +
            (historyError && historyError.message ? historyError.message : String(historyError)),
          null,
          run.runId
        ));
      }
    }
    if (typeof run.runId === "number" && isFinite(run.runId)) {
      try {
        var finalizeDiagnostics = await _finalizeSingleSelectRun(_KDB, run, outcome);
        if (Array.isArray(finalizeDiagnostics) && finalizeDiagnostics.length > 0) {
          cleanupDiagnostics.push.apply(cleanupDiagnostics, finalizeDiagnostics);
        }
      } catch (cleanupError) {
        cleanupDiagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
          "cleanup",
          "singleSelect run finalization failed: " +
            (cleanupError && cleanupError.message ? cleanupError.message : String(cleanupError)),
          null,
          run.runId
        ));
      }
    }
    const abortDiagnostics = await _restoreAbortActiveTab(_KDB, run, outcome);
    if (Array.isArray(abortDiagnostics) && abortDiagnostics.length > 0) {
      cleanupDiagnostics.push.apply(cleanupDiagnostics, abortDiagnostics);
    }
    const runtime = _ensureWritebackRuntime(_KDB);
    if (runtime) {
      runtime.parameterSetRestoreActiveCount = Math.max(0, runtime.parameterSetRestoreActiveCount - 1);
      if (runtime.parameterSetRestoreActiveCount === 0) {
        runtime.parameterSetRestoreActive = false;
      }
      if (runtime.pendingRunId === run.runId) {
        runtime.pendingRunId = null;
      }
    }
    if (loadingStarted) {
      try {
        _runGuards.finishLoadingGuarded(_KDB, run);
      } catch (loadingError) {
        cleanupDiagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_HISTORY_GUARD_FAILED,
          "cleanup",
          "loading guard finish failed: " +
            (loadingError && loadingError.message ? loadingError.message : String(loadingError)),
          null,
          run.runId
        ));
      }
    }
    if (cleanupDiagnostics.length > 0) {
      cleanupDegraded = cleanupDiagnostics.some(function (diagnostic) {
        return !isNonDegradingCleanupDiagnostic(diagnostic);
      });
      run.diagnostics = run.diagnostics.concat(cleanupDiagnostics);
    }
    run.recordPhase("cleanup", null, true, cleanupDegraded, cleanupDiagnostics);
    return cleanupDiagnostics;
  }

  return {
    finishRestoreRun: finishRestoreRun
  };
});

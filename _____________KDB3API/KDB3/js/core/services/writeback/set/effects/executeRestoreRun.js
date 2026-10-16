define([
  "../config/restoreConstants.js",
  "../../schema/errorCodes.js",
  "../state/ensureWritebackRuntime.js",
  "../state/buildRestoreResult.js",
  "./runGuards.js",
  "./runNormalRestore.js",
  "./runNewDashboardReset.js",
  "./executeRestoreRunCleanup.js",
  "./notifyRestoreOutcome.js",
  "../../bridge/parameterSetSelectConstants.js"
], function (
  _constants,
  _errorCodes,
  _ensureWritebackRuntime,
  _buildRestoreResult,
  _runGuards,
  _runNormalRestore,
  _runNewDashboardReset,
  _executeRestoreRunCleanup,
  _notifyRestoreOutcome,
  _parameterSetSelectConstants
) {
  "use strict";

  function captureParameterSetSelectId() {
    var select;
    var value;
    try {
      select = document.getElementById(_parameterSetSelectConstants.SELECT_ID);
      if (!select) return null;
      value = select.value;
      if (value === _parameterSetSelectConstants.NEW_DASHBOARD_VALUE) return null;
      if (_parameterSetSelectConstants.PLACEHOLDER_VALUES.indexOf(value) !== -1) return null;
      return value;
    } catch (error) {
      console.error("[writebackSet.captureParameterSetSelectId] failed", error);
      return null;
    }
  }

  // Common §6 steps 3-6, branch execution and guaranteed finish/cleanup for one
  // restore run. Coordinates named steps only; owner effects live in the
  // run*/dispatch modules.
  async function executeRestoreRun(_KDB, run, v3) {
    let outcome = "failed";
    let baseline = null;
    let historyBegun = false;
    let runtime = null;
    let loadingStarted = false;
    let capturedId = null;

    try {
      runtime = _ensureWritebackRuntime(_KDB);
      capturedId = captureParameterSetSelectId();
      runtime.parameterSetRestoreActive = true;
      runtime.parameterSetRestoreActiveCount += 1;
      runtime.pendingRunId = run.runId;

      loadingStarted = _runGuards.startLoadingGuarded(_KDB, run) === true;

      // Step 6: history begin before any owner dispatch (history delta §3).
      // Without a successful begin, no owner dispatch may run at all.
      historyBegun = _runGuards.historyBeginGuarded(_KDB, run);
      if (!historyBegun) {
        throw _constants.ABORT;
      }

      if (run.statusKind === "newDashboard") {
        outcome = await _runNewDashboardReset(_KDB, run);
        baseline = _buildRestoreResult.captureBaseline(run, "newDashboardReset");
      } else {
        outcome = await _runNormalRestore(_KDB, run, v3);
        baseline = _buildRestoreResult.captureBaseline(run, "postRestore");
      }
    } catch (signal) {
      if (signal === _constants.CANCELLED) {
        outcome = "cancelled";
      } else if (signal === _constants.ABORT) {
        outcome = run.abortedByOwner === true ? "abortedByOwner" : "failed";
      } else {
        outcome = "failed";
        run.addDiagnostic(_errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED, "set",
          "unexpected writebackSet error: " + (signal && signal.message ? signal.message : String(signal)));
        console.error("[writebackSet.restore] unexpected error", signal);
      }
    } finally {
      await _executeRestoreRunCleanup.finishRestoreRun(
        _KDB, run, outcome, baseline, historyBegun, loadingStarted
      );
    }

    _notifyRestoreOutcome(_KDB, run, outcome);
    var result = _buildRestoreResult.buildRestoreResult(run, outcome, baseline);
    if (result && result.ok === true && runtime) {
      runtime.lastConfirmedParameterSetId = capturedId;
    }
    return result;
  }

  return executeRestoreRun;
});

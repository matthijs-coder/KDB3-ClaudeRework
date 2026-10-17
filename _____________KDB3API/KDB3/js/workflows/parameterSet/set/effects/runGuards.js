define([
  "../../schema/errorCodes.js",
  "../state/ensureWritebackRuntime.js",
], function (_errorCodes, _ensureWritebackRuntime) {
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

  // Loading-service guards per contracts/writeback.md §6 step 5/30: best-effort,
  // a loading failure never influences the restore outcome.
  // Overlay-coverage: SET mounts .dashboardFrame; urlShareBootOverlayActive is a
  // no-op and must not coalesce onto kdb-root-loading-animation-mount.

  function startLoadingGuarded(_KDB, run) {
    var runtime;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      if (runtime.urlShareBootOverlayActive === true) {
        return false;
      }
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (!loading || typeof loading.startLoading !== "function") {
        return false;
      }
      const mountEl = readSetLoadingMountEl(_KDB);
      if (!mountEl) {
        return false;
      }
      const handle = loading.startLoading({
        mountEl: mountEl,
        mountKey: "writeback-set-loading",
        sessionMessageKey: "dashboardRestore"
      });
      run.loadingHandle = handle;
      run.loadingStarted = !!(handle && handle.mountKey);
      return run.loadingStarted;
    } catch (error) {
      console.warn("[writebackSet] startLoading failed", error);
      return false;
    }
  }

  function finishLoadingGuarded(_KDB, run) {
    try {
      if (!run || run.loadingStarted !== true) {
        return;
      }
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (loading && typeof loading.finishLoading === "function") {
        loading.finishLoading({ handle: run.loadingHandle });
      }
    } catch (error) {
      console.warn("[writebackSet] finishLoading failed", error);
    }
  }

  function readSetLoadingMountEl(_KDB) {
    try {
      const root = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
      const selector = (root && root.dashboardFrame) || ".dashboardFrame";
      if (typeof document === "undefined" || !document.querySelector) {
        return null;
      }
      return document.querySelector(selector);
    } catch (error) {
      console.warn("[writebackSet] startLoading mount resolve failed", error);
      return null;
    }
  }

  return Object.freeze({
    historyBeginGuarded: historyBeginGuarded,
    historyFinishGuarded: historyFinishGuarded,
    startLoadingGuarded: startLoadingGuarded,
    finishLoadingGuarded: finishLoadingGuarded,
  });
});

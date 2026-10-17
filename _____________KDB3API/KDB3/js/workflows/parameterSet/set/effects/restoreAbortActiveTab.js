define(["../../../../core/config/writebackErrorCodes.js"], function (_errorCodes) {
  "use strict";

  // Best-effort abort landing per writeback T2 item 5b: on non-success
  // outcomes, dispatch tabs/parameterSetAbortLandingRequested so the user
  // returns to the pre-run tab (or first visible). Never throws; failures
  // are non-degrading diagnostics and must not flip RestoreResult.outcome.
  async function restoreAbortActiveTab(_KDB, _run, _outcome) {
    const run = _run;
    if (_outcome === "committed" || _outcome === "degraded") { return []; }
    if (!run || !run.originalActive || typeof run.originalActive.index !== "number") { return []; }
    const api = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!api) { return []; }
    try {
      const result = await api.dispatch({
        type: "tabs/parameterSetAbortLandingRequested",
        payload: {
          source: "writebackSet",
          runId: run.runId,
          skipHistory: true,
          originalActive: run.originalActive,
          didActivate: run.didActivate === true
        }
      });
      if (result && result.ok === true) { return []; }
      return [abortLandingFailed(run, "abort landing click failed")];
    } catch (error) {
      return [abortLandingFailed(run, "abort landing dispatch threw: " +
        (error && error.message ? error.message : String(error)))];
    }
  }

  function abortLandingFailed(run, message) {
    return _errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_TABS_TRAVERSAL_FAILED,
      "cleanup",
      message,
      { nonDegrading: true },
      run && run.runId
    );
  }

  return restoreAbortActiveTab;
});

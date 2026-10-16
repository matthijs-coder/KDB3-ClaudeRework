define([], function () {
  "use strict";

  // RestoreResult / baseline builders per contracts/writeback.md §2.2.

  function captureBaseline(run, kind) {
    return {
      kind: kind,
      status: run.status,
      capturedAt: Date.now(),
    };
  }

  // Enforces the §2.2 ok/outcome matrix and baseline requirement.
  function buildRestoreResult(run, outcome, baseline) {
    const ok = outcome === "committed" || outcome === "degraded";
    const result = {
      ok: ok,
      status: run.status,
      runId: run.runId,
      outcome: outcome,
      diagnostics: run.diagnostics,
      phases: run.phases,
    };
    if (ok) {
      // baseline is required for committed/degraded (§2.2); optional otherwise.
      result.baseline = baseline || captureBaseline(run, run.statusKind === "newDashboard" ? "newDashboardReset" : "postRestore");
    } else if (baseline) {
      result.baseline = baseline;
    }
    return result;
  }

  return Object.freeze({
    captureBaseline: captureBaseline,
    buildRestoreResult: buildRestoreResult,
  });
});

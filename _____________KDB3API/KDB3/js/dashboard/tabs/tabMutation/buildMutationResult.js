define([], function () {
  "use strict";

  function buildMutationResult(_operationId, _phases) {
    var phases = _phases || {};
    var diagnostics = flattenDiagnostics(phases);
    var outcome = resolveOutcome(phases);
    return {
      ok: outcome === "applied",
      outcome: outcome,
      operationId: _operationId || null,
      phases: phases,
      diagnostics: diagnostics
    };
  }

  function resolveOutcome(phases) {
    var keys = Object.keys(phases || {});
    var hasDegraded = false;
    var hasCommitFailure = false;
    var hasPreCommitFailure = false;
    var hasRollbackResidual = false;
    keys.forEach(function (key) {
      var status = phases[key] && phases[key].status;
      if (status === "degraded") { hasDegraded = true; }
      if (key === "rollback" && (status === "degraded" || status === "failed")) { hasRollbackResidual = true; }
      if (status === "failed") {
        if (key === "commit" || key === "postcondition") { hasCommitFailure = true; }
        else { hasPreCommitFailure = true; }
      }
    });
    if (hasCommitFailure) { return "failed"; }
    // Master delta §2.4: "aborted" requires a CLEAN rollback; residual damage
    // after a pre-commit failure is an honest "degraded" outcome (D-CRUD-7a).
    if (hasRollbackResidual) { return "degraded"; }
    if (hasPreCommitFailure) { return "aborted"; }
    if (hasDegraded) { return "degraded"; }
    return "applied";
  }

  function flattenDiagnostics(phases) {
    var diagnostics = [];
    Object.keys(phases || {}).forEach(function (key) {
      var entries = phases[key] && Array.isArray(phases[key].diagnostics) ? phases[key].diagnostics : [];
      entries.forEach(function (entry) {
        diagnostics.push(Object.assign({ phase: key }, entry || {}));
      });
    });
    return diagnostics;
  }

  return buildMutationResult;
});

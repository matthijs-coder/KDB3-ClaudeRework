define([
  "../../../../core/utils/normalizeCognosScopeId.js"
], function (_normalizeCognosScopeId) {
  "use strict";

  // Letter B poll: bounded wait for page-context host registration after 5c
  // activate. Never throws TARGET_MISSING; caller aborts on !ready. The polling
  // itself now lives in the cognosHost filters facet; this file keeps the
  // writeback-side contract ({ready, attempts}) and the tab-to-scope mapping.
  const CAP_MS = 2500;
  const MAX_ATTEMPTS = 3;
  const INTERVAL_MS = 800;

  // Every required tab must resolve to a scope id. A target without one can
  // never become ready, and the facet would simply drop it from its list, so
  // this check has to stay on the owner side.
  function collectRequiredScopeIds(_requiredTabIdx, _resolvedTargets) {
    const scopeIds = [];
    let index;
    for (index = 0; index < _requiredTabIdx.length; index += 1) {
      const tabIdx = _requiredTabIdx[index];
      const target = _resolvedTargets && typeof _resolvedTargets === "object"
        ? (_resolvedTargets[String(tabIdx)] || _resolvedTargets[tabIdx])
        : null;
      const wanted = _normalizeCognosScopeId(target && target.scopeId);
      if (!wanted) {
        return null;
      }
      scopeIds.push(wanted);
    }
    return scopeIds;
  }

  // The facet arrives on the run context (state/createRunContext.js), so this
  // effect performs no service discovery of its own.
  async function waitForPageContextHost(_KDB, _requiredTabIdx, _resolvedTargets, _run) {
    const facet = _run ? _run.filtersFacet : null;
    let scopeIds;
    let outcome;
    try {
      if (!facet || !Array.isArray(_requiredTabIdx) || _requiredTabIdx.length === 0) {
        return { ready: false, attempts: 1 };
      }
      scopeIds = collectRequiredScopeIds(_requiredTabIdx, _resolvedTargets);
      if (!scopeIds) {
        return { ready: false, attempts: 1 };
      }
      outcome = await facet.waitForPageContextReady({
        scopeIds: scopeIds,
        budgetMs: CAP_MS,
        intervalMs: INTERVAL_MS,
        maxAttempts: MAX_ATTEMPTS
      });
      // Cancellation of the restore run is still surfaced from inside this
      // effect, as it was when the poll loop lived here.
      if (_run && typeof _run.assertStillCurrent === "function") {
        _run.assertStillCurrent();
      }
      if (outcome && outcome.data) {
        return { ready: outcome.data.ready === true, attempts: outcome.data.attempts };
      }
      return { ready: false, attempts: MAX_ATTEMPTS };
    } catch (error) {
      if (error && error.writebackSetCancelled === true) throw error;
      if (error && (error.name === "AbortError" || error.code === "ABORT_ERR")) {
        return { ready: false, attempts: 1 };
      }
      console.error("[writebackSet.waitForPageContextHost] failed", error);
      return { ready: false, attempts: 1 };
    }
  }

  return waitForPageContextHost;
});

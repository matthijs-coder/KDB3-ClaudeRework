define([
  "../config/restoreConstants.js",
  "../../../../core/config/writebackErrorCodes.js",
  "./ensureWritebackRuntime.js",
  "../effects/dispatchOwnerPhase.js",
], function (_constants, _errorCodes, _ensureWritebackRuntime, _dispatchOwnerPhase) {
  "use strict";

  // Per-run bookkeeping per contracts/writeback.md §2.2/§6: runId, diagnostics,
  // phase log and the bound owner-dispatch helper. Pure state + guards; owner
  // effects run through effects/dispatchOwnerPhase.js.
  function readFiltersFacet(_KDB) {
    const service = _KDB && _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  }

  function createRunContext(_KDB, rawStatus, statusKind, options) {
    const runtime = _ensureWritebackRuntime(_KDB);
    runtime.parameterSetRestoreRunId += 1;

    const run = {
      runId: runtime.parameterSetRestoreRunId,
      status: rawStatus,
      statusKind: statusKind,
      options: options && typeof options === "object" ? options : {},
      cancelRequested: false,
      abortedByOwner: false,
      diagnostics: [],
      phases: [],
      // Composition point for this run: effects receive the cognosHost filters
      // facet from here instead of looking the service up themselves.
      filtersFacet: readFiltersFacet(_KDB),
    };

    run.originalActive = captureOriginalActive(_KDB);
    run.didActivate = false;
    run.addDiagnostic = function (code, phase, message, details) {
      run.diagnostics.push(_errorCodes.makeDiagnostic(code, phase, message, details, run.runId));
    };

    run.recordPhase = function (name, owner, ok, degraded, phaseDiagnostics) {
      if (_constants.RESTORE_PHASE_NAMES.indexOf(name) === -1) {
        console.error("[writebackSet] unknown restore phase name: " + name);
      }
      const entry = { name: name, ok: ok === true };
      if (owner) {
        entry.owner = owner;
      }
      if (degraded === true) {
        entry.degraded = true;
      }
      if (Array.isArray(phaseDiagnostics) && phaseDiagnostics.length > 0) {
        entry.diagnostics = phaseDiagnostics;
      }
      run.phases.push(entry);
      return entry;
    };

    run.hasDegradedPhase = function () {
      return run.phases.some(function (phase) { return phase.degraded === true; });
    };

    // Stale-runId / cancellation guard (§3.1 overlap policy).
    run.assertStillCurrent = function () {
      const currentRuntime = _ensureWritebackRuntime(_KDB);
      if (run.cancelRequested || currentRuntime.parameterSetRestoreRunId !== run.runId) {
        run.addDiagnostic(_errorCodes.codes.WRITEBACK_RESTORE_CANCELLED, "restore",
          "restore run superseded or cancelled", { activeRunId: currentRuntime.parameterSetRestoreRunId });
        throw _constants.CANCELLED;
      }
    };

    run.dispatchOwnerPhase = function (spec) {
      return _dispatchOwnerPhase(_KDB, run, spec);
    };

    run.recordPhase("status", null, true);
    return run;
  }

  function captureOriginalActive(_KDB) {
    const api = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!api) { return null; }
    const state = api.getState() || {};
    const index = typeof state.activeIndex === "number" ? state.activeIndex : null;
    const tab = index !== null && state.byIndex ? state.byIndex[String(index)] : null;
    return { index: index, tabId: tab && tab.tabId || null };
  }

  return createRunContext;
});


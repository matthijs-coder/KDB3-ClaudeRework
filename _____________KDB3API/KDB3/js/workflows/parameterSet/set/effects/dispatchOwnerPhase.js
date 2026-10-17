define([
  "../config/restoreConstants.js",
  "../../../../core/config/writebackErrorCodes.js",
], function (_constants, _errorCodes) {
  "use strict";

  // Safe owner-dispatch helper per contracts/writeback.md §2.2/§6: enforces
  // runId/source/skipHistory metadata, stale-runId cancellation and structured
  // phase recording. Never mutates owner state itself; owners stay canonical.
  // Throws ABORT when a required phase fails, CANCELLED when superseded.
  async function dispatchOwnerPhase(_KDB, run, spec) {
    run.assertStillCurrent();

    const api = _KDB && _KDB.api ? _KDB.api[spec.owner] : null;
    const payload = Object.assign({}, spec.payload, {
      source: "writebackSet",
      runId: run.runId,
    });
    if (spec.skipHistoryFlag !== false) {
      payload.skipHistory = true;
    }

    let ok = false;
    let degraded = false;
    let result = null;
    const phaseDiagnostics = [];

    if (!api || typeof api.dispatch !== "function") {
      phaseDiagnostics.push(makePhaseDiagnostic(run, spec,
        "owner API \"" + spec.owner + "\" is not available for dispatch"));
    } else {
      try {
        result = await api.dispatch({ type: spec.type, payload: payload });
        recordActivateClick(run, spec, result);
        run.assertStillCurrent();
        if (result && result.ok === true) {
          ok = true;
          degraded = result.degraded === true;
          appendOwnerDiagnostics(result.diagnostics, phaseDiagnostics, run);
        } else if (result && result.ok === false) {
          phaseDiagnostics.push(makePhaseDiagnostic(run, spec,
            "owner \"" + spec.owner + "\" reported failure for " + spec.type,
            { ownerDiagnostics: result.diagnostics || null }));
        } else {
          // No structured acknowledgement: owner parameterSet* stub missing (skeleton phase).
          phaseDiagnostics.push(makePhaseDiagnostic(run, spec,
            "owner \"" + spec.owner + "\" did not acknowledge " + spec.type + " (dispatch target not implemented)"));
        }
      } catch (error) {
        if (error === _constants.CANCELLED) {
          run.recordPhase(spec.phaseName, spec.owner, false, false, phaseDiagnostics);
          throw _constants.CANCELLED;
        }
        phaseDiagnostics.push(makePhaseDiagnostic(run, spec,
          "owner dispatch threw for " + spec.type + ": " + (error && error.message ? error.message : String(error))));
      }
    }

    if (!ok && spec.degradedAllowed === true) {
      ok = true;
      degraded = true;
    }

    run.recordPhase(spec.phaseName, spec.owner, ok, degraded, phaseDiagnostics);
    phaseDiagnostics.forEach(function (diagnostic) { run.diagnostics.push(diagnostic); });

    if (!ok && spec.required) {
      run.abortedByOwner = true;
      throw _constants.ABORT;
    }
    return { ok: ok, degraded: degraded, result: result };
  }

  function recordActivateClick(_run, _spec, _result) {
    if (_spec.type === "tabs/parameterSetActivateTabRequested" && _result && _result.clicked === true) {
      _run.didActivate = true;
    }
  }

  function makePhaseDiagnostic(run, spec, message, details) {
    return _errorCodes.makeDiagnostic(
      spec.failureCode || _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
      "restore",
      message,
      details || { type: spec.type },
      run.runId
    );
  }

  function appendOwnerDiagnostics(_ownerDiagnostics, _phaseDiagnostics, _run) {
    if (!Array.isArray(_ownerDiagnostics)) return;
    _ownerDiagnostics.forEach(function (_d) {
      if (!_d) return;
      _phaseDiagnostics.push(_errorCodes.makeDiagnostic(
        _d.code,
        "restore",
        _d.message || "",
        _d.details,
        _run.runId
      ));
    });
  }

  return dispatchOwnerPhase;
});

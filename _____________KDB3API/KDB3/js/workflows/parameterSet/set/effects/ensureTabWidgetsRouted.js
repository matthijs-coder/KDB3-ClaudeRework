define([
  "../config/restoreConstants.js",
  "../../schema/errorCodes.js",
], function (_constants, _errorCodes) {
  "use strict";

  // §6.4 step 23 precondition (amended 2026-07-11) / §6.6 /
  // widgetBase-lazyLaunchpadRouting-contractdelta.md §5: after each tab
  // activation for a widget-restore target, await
  // widgetBase/ensureTabWidgetsRouted so pre-restore canvas widgets of lazily
  // loaded tabs are parked on the launchpad before step 24 restores shells.
  //
  // Required phase: non-cancel failure (including missing widgetBase api or
  // unimplemented dispatch target) aborts widget restore, mirroring the
  // §6.6.1 step 24 failure behavior in effects/dispatchOwnerPhase.js.
  // Owner-reported WRITEBACK_RESTORE_CANCELLED (stale runId per widgetBase's
  // runtime.widgetBase.parameterSetRunId convention) follows the run cancel path,
  // mirroring run.assertStillCurrent.
  //
  // Own phase name in the §2.2 RestorePhaseName enum (added 2026-07-12) so
  // telemetry distinguishes tab activation from ensure-routed.
  const PHASE_NAME = "tabWidgetsEnsureRouted";
  const OWNER = "widgetBase";
  const TYPE = "widgetBase/ensureTabWidgetsRouted";
  // Bounded extra ensure dispatches while leftover shells keep the tab unrouted.
  // Cap 2 extra (3 total including the first). Hard failure is not retried.
  const EXTRA_ENSURE_CAP = 2;

  async function ensureTabWidgetsRouted(_KDB, run, tabIdx, tabTargets) {
    run.assertStillCurrent();

    const target = tabTargets && typeof tabTargets === "object" ? tabTargets[tabIdx] : null;
    const tabId = target && target.tabId !== undefined && target.tabId !== null && target.tabId !== ""
      ? target.tabId : null;
    if (tabId === null) {
      failPhase(run, _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
        "no runtime tabId resolved for widget tab index " + tabIdx + "; cannot ensure launchpad routing",
        { type: TYPE, tabIdx: tabIdx });
    }

    const api = _KDB && _KDB.api ? _KDB.api.widgetBase : null;
    if (!api || typeof api.dispatch !== "function") {
      failPhase(run, _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
        "owner API \"" + OWNER + "\" is not available for " + TYPE,
        { type: TYPE, tabIdx: tabIdx, tabId: tabId });
    }

    let result = null;
    try {
      result = await reensureTabWidgetsRouted(api, run, tabId);
    } catch (error) {
      if (error === _constants.CANCELLED) {
        run.recordPhase(PHASE_NAME, OWNER, false, false);
        throw _constants.CANCELLED;
      }
      failPhase(run, _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
        "owner dispatch threw for " + TYPE + ": " + (error && error.message ? error.message : String(error)),
        { type: TYPE, tabIdx: tabIdx, tabId: tabId });
    }

    if (result && result.ok === true) {
      recordRoutedPhase(run, tabIdx, tabId, result);
      return;
    }

    if (result && result.ok === false
        && result.errorCode === _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED) {
      // Stale-guard per contractdelta §5: treat as superseded run, no abort diagnostic.
      run.addDiagnostic(_errorCodes.codes.WRITEBACK_RESTORE_CANCELLED, "restore",
        "widgetBase reported stale runId for " + TYPE + "; restore run cancelled",
        { type: TYPE, tabIdx: tabIdx, tabId: tabId });
      run.recordPhase(PHASE_NAME, OWNER, false, false);
      throw _constants.CANCELLED;
    }

    if (result && result.ok === false) {
      failPhase(run, _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
        "owner \"" + OWNER + "\" reported failure for " + TYPE,
        {
          type: TYPE, tabIdx: tabIdx, tabId: tabId,
          errorCode: result.errorCode || null,
          routed: result.routed, skipped: result.skipped, failed: result.failed,
        });
    }

    // No structured acknowledgement: dispatch target not implemented/loaded.
    failPhase(run, _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
      "owner \"" + OWNER + "\" did not acknowledge " + TYPE + " (dispatch target not implemented)",
      { type: TYPE, tabIdx: tabIdx, tabId: tabId });
  }

  // Mirrors the required-phase failure pattern of dispatchOwnerPhase:
  // structured diagnostic + failed phase record + ABORT sentinel.
  function failPhase(run, code, message, details) {
    const diagnostic = _errorCodes.makeDiagnostic(code, "restore", message, details, run.runId);
    run.recordPhase(PHASE_NAME, OWNER, false, false, [diagnostic]);
    run.diagnostics.push(diagnostic);
    throw _constants.ABORT;
  }

  async function reensureTabWidgetsRouted(api, run, tabId) {
    let result = await dispatchEnsure(api, run, tabId);
    let extraEnsures = 0;
    while (shouldReensure(result) && extraEnsures < EXTRA_ENSURE_CAP) {
      extraEnsures += 1;
      result = await dispatchEnsure(api, run, tabId);
    }
    return result;
  }

  async function dispatchEnsure(api, run, tabId) {
    const result = await api.dispatch({
      type: TYPE,
      payload: { tabId: tabId, reason: "writebackSet", runId: run.runId },
    });
    run.assertStillCurrent();
    return result;
  }

  function shouldReensure(result) {
    return !!(result && result.ok === true
      && readCount(result.missingShells) > 0
      && result.alreadyRouted !== true);
  }

  function recordRoutedPhase(run, tabIdx, tabId, result) {
    const missingShells = readCount(result && result.missingShells);
    let phaseDiagnostics;
    if (missingShells > 0) {
      const diagnostic = _errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
        "restore",
        "ensure reported leftover launchpad shells after bounded re-ensure",
        { missingShells: missingShells, tabIdx: tabIdx, tabId: tabId, nonDegrading: true },
        run.runId
      );
      phaseDiagnostics = [diagnostic];
      run.diagnostics.push(diagnostic);
    }
    const entry = run.recordPhase(PHASE_NAME, OWNER, true, false, phaseDiagnostics);
    entry.missingShells = missingShells;
  }

  function readCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return ensureTabWidgetsRouted;
});

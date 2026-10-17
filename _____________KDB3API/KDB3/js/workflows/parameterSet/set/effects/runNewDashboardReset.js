define([
  "../../../../core/config/writebackErrorCodes.js",
  "../state/readOwnerTargets.js",
], function (_errorCodes, _readOwnerTargets) {
  "use strict";

  // §6.0.1 newDashboard reset branch: reset-only, saved v3 content is ignored.
  async function runNewDashboardReset(_KDB, run) {
    // 1. widget reset.
    await run.dispatchOwnerPhase({
      phaseName: "widgetReset", owner: "widgetBase",
      type: "widgetBase/parameterSetResetRequested",
      payload: { status: run.status },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_WIDGET_RESET_FAILED,
    });
    // 2. empty filters through owner clear actions (non-fatal per §6.3 clear row).
    for (const owner of ["sicht", "singleSelect", "dienststelle", "nativeMultiSelect"]) {
      await run.dispatchOwnerPhase({
        phaseName: "filterClear", owner: owner,
        type: owner + "/parameterSetClearRequested",
        payload: { status: run.status },
        required: false, failureCode: _errorCodes.codes.WRITEBACK_FILTER_CLEAR_FAILED,
      });
    }
    await run.dispatchOwnerPhase({
      phaseName: "filterClear", owner: "sicht",
      type: "sicht/syncRequested",
      payload: {},
      required: false, failureCode: _errorCodes.codes.WRITEBACK_FILTER_CLEAR_FAILED,
    });
    // 3-5. owner defaults for tabs, canvas/settings, header/footer.
    await run.dispatchOwnerPhase({
      phaseName: "newDashboardReset", owner: "tabs",
      type: "tabs/parameterSetResetRequested",
      payload: { status: run.status },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
    });
    await run.dispatchOwnerPhase({
      phaseName: "newDashboardReset", owner: "kdbControl",
      type: "kdbControl/parameterSetRestoreRequested",
      payload: { canvas: undefined, settings: undefined, status: run.status },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_KDBCONTROL_RESTORE_FAILED,
    });
    const headerResult = await run.dispatchOwnerPhase({
      phaseName: "newDashboardReset", owner: "header",
      type: "header/parameterSetRestoreRequested",
      payload: { header: undefined, status: run.status },
      required: true,
      failureCode: _errorCodes.codes.WRITEBACK_HEADER_RESTORE_FAILED,
    });
    await run.dispatchOwnerPhase({
      phaseName: "newDashboardReset", owner: "footer",
      type: "footer/parameterSetRestoreRequested",
      payload: {
        footer: undefined,
        headerStatus: _readOwnerTargets.readHeaderStatus(_KDB, headerResult),
        status: run.status,
      },
      required: true,
    });

    return run.hasDegradedPhase() ? "degraded" : "committed";
  }

  return runNewDashboardReset;
});

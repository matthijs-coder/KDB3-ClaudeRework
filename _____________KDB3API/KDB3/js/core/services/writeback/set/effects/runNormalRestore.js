define([
  "../../schema/errorCodes.js",
  "../state/validateRestorePayload.js",
  "../state/readOwnerTargets.js",
  "./runFilterRestore.js",
  "./runWidgetRestore.js",
  "./publishRestoreTabCaption.js",
], function (_errorCodes, _validateRestorePayload, _readOwnerTargets, _runFilterRestore, _runWidgetRestore, _publishRestoreTabCaption) {
  "use strict";

  // §6 steps 8-28 (normal-restore sequence). Omitted tabs/filt/wgts sections
  // are skipped per §4.3/§4.4: absence means owner state stays owner-controlled.
  async function runNormalRestore(_KDB, run, v3) {
    const normalized = _validateRestorePayload(run, v3);

    // Step 9: widget reset through owner API (§6.1). Always required.
    await run.dispatchOwnerPhase({
      phaseName: "widgetReset", owner: "widgetBase",
      type: "widgetBase/parameterSetResetRequested",
      payload: { status: run.status },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_WIDGET_RESET_FAILED,
    });

    // Step 10: canvas/settings through kdbControl (§6.2).
    await run.dispatchOwnerPhase({
      phaseName: "kdbControlRestore", owner: "kdbControl",
      type: "kdbControl/parameterSetRestoreRequested",
      payload: { canvas: normalized.canv, settings: normalized.sett, status: run.status },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_KDBCONTROL_RESTORE_FAILED,
    });

    // Steps 11-12: header before footer; footer receives captured headerStatus (§6.2).
    const headerResult = await run.dispatchOwnerPhase({
      phaseName: "headerRestore", owner: "header",
      type: "header/parameterSetRestoreRequested",
      payload: { header: normalized.head, status: run.status },
      required: normalized.head !== undefined,
      failureCode: _errorCodes.codes.WRITEBACK_HEADER_RESTORE_FAILED,
    });
    await run.dispatchOwnerPhase({
      phaseName: "footerRestore", owner: "footer",
      type: "footer/parameterSetRestoreRequested",
      payload: {
        footer: normalized.foot,
        headerStatus: _readOwnerTargets.readHeaderStatus(_KDB, headerResult),
        status: run.status,
      },
      required: normalized.foot !== undefined,
      failureCode: _errorCodes.codes.WRITEBACK_FOOTER_HEADER_GUARD,
    });

    // Steps 13-14: tabs restore only when tabs is present (§4.4).
    let tabsResult = null;
    if (normalized.tabs !== undefined) {
      tabsResult = await run.dispatchOwnerPhase({
        phaseName: "tabsRestore", owner: "tabs",
        type: "tabs/parameterSetRestoreRequested",
        payload: { tabs: normalized.tabs },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
      });
    }
    const tabTargets = _readOwnerTargets.resolveTabTargets(_KDB, run, tabsResult);

    // Steps 15-22: filter pipeline only when filt is present (§4.3).
    if (normalized.filt !== undefined) {
      await _runFilterRestore(_KDB, run, normalized);
    }

    // Steps 23-27: widget pipeline only when wgts is present (§6.6/§6.6.1).
    if (normalized.wgts !== undefined) {
      await _runWidgetRestore(_KDB, run, normalized, tabTargets);
    }

    // Step 28: post-restore traversal for dashboard tabs visible after restore.
    if (normalized.tabs !== undefined || normalized.wgts !== undefined) {
      await run.dispatchOwnerPhase({
        phaseName: "tabsPostRestoreTraverse", owner: "tabs",
        type: "tabs/postParameterSetRestoreTraverseRequested",
        payload: {
          scope: "visibleDashboard",
          includeHiddenDashboardTabs: false,
          restoreActiveTab: true,
        },
        required: false, failureCode: _errorCodes.codes.WRITEBACK_TABS_TRAVERSAL_FAILED,
      });
      _publishRestoreTabCaption(_KDB, run, { landing: true });
    }

    return run.hasDegradedPhase() ? "degraded" : "committed";
  }

  return runNormalRestore;
});

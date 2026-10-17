define([
  "../../../../core/config/writebackErrorCodes.js",
  "./ensureTabWidgetsRouted.js",
  "./bindVisPerActiveTab.js",
], function (_errorCodes, _ensureTabWidgetsRouted, _bindVisPerActiveTab) {
  "use strict";

  // §6 steps 23-27 / §6.6 / §6.6.1 widget restore orchestration.
  // Runs only when wgts is present; entries are descriptive-key objects.
  async function runWidgetRestore(_KDB, run, normalized, tabTargets) {
    const widgetTabIdxSet = [];
    normalized.wgts.forEach(function (widget) {
      if (widget && typeof widget === "object" && widgetTabIdxSet.indexOf(widget.tab) === -1) {
        widgetTabIdxSet.push(widget.tab);
      }
    });

    // Step 23: pre-activate tab targets needed by widget restore; after each
    // activation, await ensure-routed so lazily loaded tabs park their
    // pre-restore widgets on the launchpad (amended 2026-07-11, §6.6).
    for (const tabIdx of widgetTabIdxSet) {
      await run.dispatchOwnerPhase({
        phaseName: "tabActivateForWidgets", owner: "tabs",
        type: "tabs/parameterSetActivateTabRequested",
        payload: { tabIdx: tabIdx, includeHiddenDashboardTabs: true, restoreActiveTab: false },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
      });
      await _ensureTabWidgetsRouted(_KDB, run, tabIdx, tabTargets);
    }

    // Step 24: shells/layout via widgetBase; returns entryIndex -> widgetId map.
    const baseResult = await run.dispatchOwnerPhase({
      phaseName: "widgetBaseRestore", owner: "widgetBase",
      type: "widgetBase/parameterSetRestoreRequested",
      payload: { widgets: normalized.wgts, tabTargets: tabTargets },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
    });
    const widgetCorrelation = baseResult && baseResult.result && baseResult.result.widgetCorrelation
      ? baseResult.result.widgetCorrelation : null;

    // Step 25: committed settings batch via widgetSettings.
    await run.dispatchOwnerPhase({
      phaseName: "widgetSettingsRestore", owner: "widgetSettings",
      type: "widgetSettings/parameterSetRestoreBatchRequested",
      payload: { widgets: normalized.wgts, widgetCorrelation: widgetCorrelation },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
    });

    // Step 26: text content via widgetText (only when txt widgets exist).
    const hasTxt = normalized.wgts.some(function (widget) { return widget && widget.kind === "txt"; });
    if (hasTxt) {
      await run.dispatchOwnerPhase({
        phaseName: "widgetTextRestore", owner: "widgetText",
        type: "widgetText/parameterSetRestoreRequested",
        payload: { widgets: normalized.wgts, widgetCorrelation: widgetCorrelation },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
      });
    }

    // Step 27: widgetVis binding per active tab (writeback-step27-bindPerActiveTab-contractdelta.md).
    const hasVis = normalized.wgts.some(function (widget) { return widget && widget.kind === "vis"; });
    if (hasVis) {
      await _bindVisPerActiveTab(_KDB, run, widgetCorrelation);
    }
  }

  return runWidgetRestore;
});

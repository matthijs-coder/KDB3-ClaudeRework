define([], function () {
  "use strict";

  // Declarative restore constants per contracts/writeback.md §2.2 / §3.1.

  // §2.2 RestorePhaseName enum.
  const RESTORE_PHASE_NAMES = Object.freeze([
    "status", "validate", "historyBegin", "newDashboardReset", "widgetReset",
    "kdbControlRestore", "headerRestore", "footerRestore", "tabsRestore",
    "tabTargetResolve", "filterScopeResolve", "singleSelectPreRestoreReconcile", "filterClear", "sichtRestore", "singleSelectGlobalRestore",
    "tabActivateForPageContext", "singleSelectPageContextRestore", "nativeMultiSelectRestore",
    "sichtDownstreamVisibility", "dienststelleRestore", "singleSelectResync", "specialSingleSelectRestoreSync",
    "tabActivateForWidgets", "tabWidgetsEnsureRouted", "widgetBaseRestore", "widgetSettingsRestore",
    "widgetTextRestore", "widgetVisBinding", "tabsPostRestoreTraverse",
    "historyFinish", "cleanup",
  ]);

  // §3.1 status semantics. Raw status string stays in RestoreResult.status.
  // "defaultparamset" (all lowercase) is a legacy caller spelling, contract-synced 2026-07-10.
  const STATUS_TABLE = Object.freeze({
    notDefaultParamSet: "direct",
    "default": "default",
    defaultParamSet: "default",
    defaultparamset: "default",
    defaultparameterset: "default",
    newDashboard: "newDashboard",
  });

  // A missing status means a direct (non-default) load.
  function normalizeStatus(status) {
    return status === undefined || status === null ? "notDefaultParamSet" : String(status);
  }

  // Internal control-flow sentinels; identity-compared, never leave restore().
  const ABORT = Object.freeze({ writebackSetAbort: true });
  const CANCELLED = Object.freeze({ writebackSetCancelled: true });

  return Object.freeze({
    RESTORE_PHASE_NAMES: RESTORE_PHASE_NAMES,
    STATUS_TABLE: STATUS_TABLE,
    normalizeStatus: normalizeStatus,
    ABORT: ABORT,
    CANCELLED: CANCELLED,
  });
});

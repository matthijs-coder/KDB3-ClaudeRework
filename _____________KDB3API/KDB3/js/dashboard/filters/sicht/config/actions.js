define([], function () {
  "use strict";

  return {
    MOUNT_SUCCEEDED: "sicht/mountSucceeded",
    FILTER_DOCK_STATE_CHANGED: "sicht/filterDockStateChanged",
    FILTER_DOCK_POPUP_READY: "sicht/filterDockPopupReady",
    SINGLE_SELECT_COMMITTED: "sicht/singleSelectCommitted",
    SINGLE_SELECT_DRAFT_CHANGED: "sicht/singleSelectDraftChanged",
    SINGLE_SELECT_DRAFT_REVERTED: "sicht/singleSelectDraftReverted",
    SINGLE_SELECT_INVENTORY_RECONCILED: "sicht/singleSelectInventoryReconciled",
    HISTORY_STEP_FINALIZED: "sicht/historyStepFinalized",
    PARAMETER_SET_CLEAR_REQUESTED: "sicht/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "sicht/parameterSetRestoreRequested",
    PARAMETER_SET_DOWNSTREAM_VISIBILITY_REQUESTED: "sicht/parameterSetDownstreamVisibilityRequested",
    TABLE_DATA_CHANGED: "sicht/tableDataChanged",
    SYNC_REQUESTED: "sicht/syncRequested",
    SYNC_OPTIONS_EVALUATED: "sicht/syncOptionsEvaluated",
    STARTUP_DEFAULT_IN_PROGRESS: "sicht/startupDefaultInProgress",
    STARTUP_DEFAULT_FAILED: "sicht/startupDefaultFailed",
    ERROR: "sicht/error",
    DESTROY: "sicht/destroy"
  };
});

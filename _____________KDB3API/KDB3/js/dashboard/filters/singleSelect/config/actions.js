define([], function () {
  "use strict";

  return {
    MOUNT_SUCCEEDED: "singleSelect/mountSucceeded",
    FILTER_DOCK_STATE_CHANGED: "singleSelect/filterDockStateChanged",
    FILTER_DOCK_POPUP_READY: "singleSelect/filterDockPopupReady",
    FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED: "singleSelect/filterDockCommittedDisplayObserved",
    RECONCILE_FILTER_INSTANCES: "singleSelect/reconcileFilterInstances",
    APPLY_OWNER_SELECTION: "singleSelect/applyOwnerSelection",
    APPLY_SPECIAL_SELECTION_POLICY: "singleSelect/applySpecialSelectionPolicy",
    SICHT_HISTORY_REPLAY_COMMITTED: "singleSelect/sichtHistoryReplayCommitted",
    PARAMETER_SET_CLEAR_REQUESTED: "singleSelect/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "singleSelect/parameterSetRestoreRequested",
    PARAMETER_SET_RESYNC_REQUESTED: "singleSelect/parameterSetResyncRequested",
    PARAMETER_SET_RUN_FINISHED: "singleSelect/parameterSetRunFinished",
    PREPARE_TAB_MUTATION: "singleSelect/prepareTabMutation",
    APPLY_TAB_MUTATION: "singleSelect/applyTabMutation",
    RESTORE_TAB_MUTATION_SNAPSHOT: "singleSelect/restoreTabMutationSnapshot",
    RESYNC_TAB_MUTATION_HOST: "singleSelect/resyncTabMutationHost",
    ERROR: "singleSelect/error",
    DESTROY: "singleSelect/destroy"
  };
});

define([], function () {
  "use strict";

  return {
    MOUNT_READY: "nativeMultiSelect/mountReady",
    PREPARE_TAB_MUTATION: "nativeMultiSelect/prepareTabMutation",
    APPLY_TAB_MUTATION: "nativeMultiSelect/applyTabMutation",
    RESTORE_TAB_MUTATION_SNAPSHOT: "nativeMultiSelect/restoreTabMutationSnapshot",
    RESYNC_TAB_MUTATION_HOST: "nativeMultiSelect/resyncTabMutationHost",
    TAB_MUTATION_SCOPE_WRITE: "nativeMultiSelect/tabMutationScopeWrite",
    PARAMETER_SET_CLEAR_REQUESTED: "nativeMultiSelect/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "nativeMultiSelect/parameterSetRestoreRequested",
    COLLECT_WRITEBACK_SNAPSHOT_REQUESTED: "nativeMultiSelect/collectWritebackSnapshotRequested",
    FILTER_DOCK_STATE_CHANGED: "nativeMultiSelect/filterDockStateChanged",
    HISTORY_REPLAY_REQUESTED: "nativeMultiSelect/historyReplayRequested",
    ERROR: "nativeMultiSelect/error",
    DESTROY: "nativeMultiSelect/destroy"
  };
});

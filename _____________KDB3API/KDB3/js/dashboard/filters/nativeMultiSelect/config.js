define([], function () {
  "use strict";

  var actions = {
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

  var parameterSetCodes = Object.freeze({
    RESTORE_FAILED: "WRITEBACK_FILTER_RESTORE_FAILED",
    CLEAR_FAILED: "WRITEBACK_FILTER_CLEAR_FAILED",
    CANCELLED: "WRITEBACK_RESTORE_CANCELLED",
    TARGET_MISSING: "WRITEBACK_TABS_TARGET_MISSING",
    SKIPPED: "WRITEBACK_SKIPPED_BY_DESIGN"
  });

  var tabMutationCodes = Object.freeze({
    APPLY_FAILED: "TABS_MUTATION_APPLY_FAILED",
    PREPARE_FAILED: "TABS_MUTATION_PREPARE_FAILED",
    ROLLBACK_INCOMPLETE: "TABS_MUTATION_ROLLBACK_INCOMPLETE",
    CANCELLED: "TABS_MUTATION_CANCELLED"
  });

  return {
    actions: actions,
    parameterSetCodes: parameterSetCodes,
    tabMutationCodes: tabMutationCodes,
    HISTORY_STEP_KEY: "filter_nativeMultiSelect"
  };
});

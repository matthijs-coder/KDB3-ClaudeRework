define([], function () {
  "use strict";

  return {
    MOUNT_READY: "dienststelle/mountReady",
    FILTER_DOCK_STATE_CHANGED: "dienststelle/filterDockStateChanged",
    FILTER_DOCK_POPUP_READY: "dienststelle/filterDockPopupReady",
    FILTER_DOCK_FILTERS_READY: "dienststelle/filterDockFiltersReady",
    FILTER_DOCK_HEADER_OBSERVED: "dienststelle/filterDockHeaderObserved",
    FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED: "dienststelle/filterDockCommittedDisplayObserved",
    SICHT_CHANGED: "dienststelle/sichtChanged",
    SELECTION_OBSERVED: "dienststelle/selectionObserved",
    SELECTION_CLEARED: "dienststelle/selectionCleared",
    DEFAULT_APPLIED: "dienststelle/defaultApplied",
    HISTORY_REPLAY_REQUESTED: "dienststelle/historyReplayRequested",
    HISTORY_REPLAY_APPLIED: "dienststelle/historyReplayApplied",
    SYNC_REQUESTED: "dienststelle/syncRequested",
    TABLE_DATA_CHANGED: "dienststelle/tableDataChanged",
    PARAMETER_SET_CLEAR_REQUESTED: "dienststelle/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "dienststelle/parameterSetRestoreRequested",
    PREPARE_TAB_MUTATION: "dienststelle/prepareTabMutation",
    APPLY_TAB_MUTATION: "dienststelle/applyTabMutation",
    RESTORE_TAB_MUTATION_SNAPSHOT: "dienststelle/restoreTabMutationSnapshot",
    RESYNC_TAB_MUTATION_HOST: "dienststelle/resyncTabMutationHost",
    TAB_MUTATION_SCOPE_WRITE: "dienststelle/tabMutationScopeWrite",
    FILTER_STATUS_CHANGED: "dienststelle/filterStatusChanged",
    ERROR: "dienststelle/error",
    DESTROY: "dienststelle/destroy"
  };
});

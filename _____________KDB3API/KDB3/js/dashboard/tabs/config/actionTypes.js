define([], function () {
  "use strict";

  return {
    INITIALIZE: "tabs/initialize",
    SYNC_FROM_DOM: "tabs/syncFromDom",
    ACTIVE_TAB_OBSERVED: "tabs/activeTabObserved",
    HYDRATE_DOM: "tabs/hydrateDom",
    TRAVERSE: "tabs/traverse",
    ADD: "tabs/add",
    SELECT_EDIT_TARGET: "tabs/selectEditTarget",
    SELECT_TOOL: "tabs/selectTool",
    RENAME: "tabs/rename",
    CANCEL_EDIT_SESSION: "tabs/cancelEditSession",
    AUTHORING_ENTERED: "tabs/authoringEntered",
    AUTHORING_EXITED: "tabs/authoringExited",
    PARAMETER_SET_RESTORE: "tabs/parameterSetRestoreRequested",
    PARAMETER_SET_RESET: "tabs/parameterSetResetRequested",
    PARAMETER_SET_ACTIVATE_TAB: "tabs/parameterSetActivateTabRequested",
    PARAMETER_SET_ABORT_LANDING: "tabs/parameterSetAbortLandingRequested",
    POST_PARAMETER_SET_RESTORE_TRAVERSE: "tabs/postParameterSetRestoreTraverseRequested",
    WRITEBACK_GET_PERSIST_LANDING: "tabs/writebackGetPersistLandingRequested",
    RESOLVE_FILTER_SCOPE_TARGETS: "tabs/resolveFilterScopeTargets",
    PARAMETER_SET_APPLY: "tabs/parameterSetApply",
    TAB_MUTATION_APPLY: "tabs/tabMutationApply",
    ERROR: "tabs/error",
    DESTROY: "tabs/destroy",
    DELETE: "tabs/delete",
    DUPLICATE: "tabs/duplicate",
    RESTORE_DELETED: "tabs/restoreDeleted",
    MOVE: "tabs/move",
    REORDER: "tabs/reorder"
  };
});

define(["../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  var actions = {
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

  var errorCodes = {
    RECONCILE_FAILED: "SINGLE_SELECT_RECONCILE_FAILED",
    RECONCILE_TIMEOUT: "SINGLE_SELECT_RECONCILE_TIMEOUT",
    INSTANCE_NOT_FOUND: "SINGLE_SELECT_INSTANCE_NOT_FOUND",
    INSTANCE_AMBIGUOUS: "SINGLE_SELECT_INSTANCE_AMBIGUOUS",
    IDENTITY_COLLISION: "SINGLE_SELECT_IDENTITY_COLLISION",
    IDENTITY_LABEL_FALLBACK: "SINGLE_SELECT_IDENTITY_LABEL_FALLBACK",
    IDENTITY_ENRICHED: "SINGLE_SELECT_IDENTITY_ENRICHED",
    SCOPE_TARGET_UNVERIFIED: "SINGLE_SELECT_SCOPE_TARGET_UNVERIFIED",
    COMMIT_VERIFICATION_MISMATCH: "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH",
    HOST_ROLLBACK_UNVERIFIED: "SINGLE_SELECT_HOST_ROLLBACK_UNVERIFIED",
    HOST_WRITE_FAILED: "SINGLE_SELECT_HOST_WRITE_FAILED",
    HOST_VALUE_READ_FAILED: "SINGLE_SELECT_HOST_VALUE_READ_FAILED",
    HOST_ITEM_UNKNOWN: "SINGLE_SELECT_HOST_ITEM_UNKNOWN",
    INVENTORY_OWNER_API_MISSING: "SINGLE_SELECT_INVENTORY_OWNER_API_MISSING",
    INVENTORY_OWNER_DISPOSED: "SINGLE_SELECT_INVENTORY_OWNER_DISPOSED",
    INVENTORY_OWNER_REJECTED: "SINGLE_SELECT_INVENTORY_OWNER_REJECTED",
    INVENTORY_OWNER_DISPATCH_FAILED: "SINGLE_SELECT_INVENTORY_OWNER_DISPATCH_FAILED",
    SEMANTIC_INSTANCE_KEY_MISSING: "SINGLE_SELECT_SEMANTIC_INSTANCE_KEY_MISSING",
    SEMANTIC_INSTANCE_KEY_DUPLICATE: "SINGLE_SELECT_SEMANTIC_INSTANCE_KEY_DUPLICATE",
    OWNER_SELECTION_INVALID: "SINGLE_SELECT_OWNER_SELECTION_INVALID",
    SICHT_DRAFT_DISPATCH_FAILED: "SINGLE_SELECT_SICHT_DRAFT_DISPATCH_FAILED",
    SPECIAL_INSTANCE_MISSING: "SPECIAL_SINGLE_SELECT_INSTANCE_MISSING",
    SPECIAL_POLICY_APPLY_FAILED: "SPECIAL_SINGLE_SELECT_POLICY_APPLY_FAILED",
    RESTORE_DISPLAY_DEGRADED: "SINGLE_SELECT_RESTORE_DISPLAY_DEGRADED",
    FILTERS_READY_ROUTE_MISSING: "SINGLE_SELECT_FILTERS_READY_ROUTE_MISSING",
    RECONCILE_REASON_INVALID: "SINGLE_SELECT_RECONCILE_REASON_INVALID",
    TAB_MUTATION_CANCELLED: "TABS_MUTATION_CANCELLED",
    TAB_MUTATION_PREPARE_FAILED: "TABS_MUTATION_PREPARE_FAILED",
    TAB_MUTATION_APPLY_FAILED: "TABS_MUTATION_APPLY_FAILED",
    TAB_MUTATION_ROLLBACK_INCOMPLETE: "TABS_MUTATION_ROLLBACK_INCOMPLETE"
  };

  var parameterSetCodes = {
    CANCELLED: "WRITEBACK_RESTORE_CANCELLED",
    INVENTORY_STALE: "WRITEBACK_SINGLESELECT_INVENTORY_STALE",
    RECONCILE_REASON_INVALID: "SINGLE_SELECT_RECONCILE_REASON_INVALID",
    TARGET_MISSING: "WRITEBACK_TABS_TARGET_MISSING",
    FILTER_KIND_UNSUPPORTED: "WRITEBACK_FILTER_KIND_UNSUPPORTED",
    RESTORE_FAILED: "WRITEBACK_FILTER_RESTORE_FAILED",
    INVALID_PHASE: "WRITEBACK_SINGLESELECT_PHASE_INVALID",
    INVALID_ENTRY: "WRITEBACK_SINGLESELECT_ENTRY_INVALID",
    INSTANCE_AMBIGUOUS: "WRITEBACK_SINGLESELECT_INSTANCE_AMBIGUOUS",
    INSTANCE_MISSING: "WRITEBACK_SINGLESELECT_INSTANCE_MISSING",
    DISPLAY_DEGRADED: "WRITEBACK_SINGLESELECT_DISPLAY_DEGRADED",
    PAGE_CONTEXT_COLLISION: "WRITEBACK_SINGLESELECT_PAGECONTEXT_COLLISION",
    RESYNC_FAILED: "WRITEBACK_SINGLESELECT_RESYNC_FAILED",
    RESYNC_UNREGISTERED: "WRITEBACK_SINGLESELECT_RESYNC_UNREGISTERED",
    RUN_FINISH_INVALID: "SINGLE_SELECT_PARAMETER_SET_RUN_FINISH_INVALID",
    RUN_FINISH_ALREADY_RELEASED: "SINGLE_SELECT_PARAMETER_SET_RUN_ALREADY_RELEASED"
  };

  // Failure codes for historyService-filterInstanceIdentity-contractdelta.md
  // §5, amendment 2026-08-10. STEP_INVALID reuses the generic step-validation
  // code named in that contract's §4 (`HISTORY_STEP_INVALID`); every other
  // code is namespaced under the singleSelect replay contribution.
  var historyReplayCodes = {
    INSTANCE_MISSING: "SINGLE_SELECT_HISTORY_INSTANCE_MISSING",
    INSTANCE_AMBIGUOUS: "SINGLE_SELECT_HISTORY_INSTANCE_AMBIGUOUS",
    DISPLAY_UNAVAILABLE: "SINGLE_SELECT_HISTORY_DISPLAY_UNAVAILABLE",
    REPLAY_FAILED: "SINGLE_SELECT_HISTORY_REPLAY_FAILED",
    ROLLBACK_FAILED: "SINGLE_SELECT_HISTORY_ROLLBACK_FAILED",
    OWNER_NOTIFY_FAILED: "SINGLE_SELECT_HISTORY_OWNER_NOTIFY_FAILED",
    STEP_INVALID: "HISTORY_STEP_INVALID"
  };

  var domSelectors = {
    alleOptionMountSelector: chrome.alleOptionMountSelector,
    alleOptionClass: "KDB_singleSelect_AlleOption",
    optionLabelSelector: chrome.optionLabelSelector,
    optionWrapperSelector: chrome.optionWrapperSelector,
    roleOptionSelector: chrome.roleOptionSelector,
    checkboxInputSelector: chrome.checkboxInputSelector,
    nativeFooterSelector: chrome.nativeFooterSelector,
    customFooterSelector: ".KDB_singleSelectFooter",
    footerOkButtonSelector: chrome.footerOkButtonSelector,
    footerCancelButtonSelector: chrome.footerCancelButtonSelector,
    selectedOptionClass: chrome.selectedOptionClass,
    disabledButtonClass: chrome.disabledButtonClass,
    footerTid: chrome.footerTid,
    footerCloneClassName: chrome.footerCloneClassName,
    filterItemBottomSelector: chrome.filterItemBottomSelector,
    popupMountFallbackSelector: chrome.popupMountFallbackSelector,
    outClickCatcherSelector: chrome.outClickCatcherSelector,
    filterDockRootSelector: chrome.rootSelector,
    globalDockBucketSelector: chrome.globalDockSelector,
    pageContextDockBucketSelector: chrome.pageContextDockSelector,
    filterDataIdAttr: chrome.filterDataIdAttr,
    filterItemWrapperClass: chrome.filterItemWrapperClass,
    committedDisplaySelector: chrome.committedDisplaySelector,
    committedDisplayParentSelector: chrome.committedDisplayParentSelector
  };

  return {
    ALLE: "Alle",
    DELEGATED_OPERATION_WINDOW: 100,
    DIAGNOSTICS_LIMIT: 50,
    actions: actions,
    errorCodes: errorCodes,
    parameterSetCodes: parameterSetCodes,
    historyReplayCodes: historyReplayCodes,
    domSelectors: domSelectors
  };
});

define([
  "../../core/cognosHost/config/tabChromeSelectors.js",
  "./config/defaults.js",
  "./config/mutationCodes.js"
], function (_tabChrome, _defaults, _mutationCodes) {
  "use strict";

  // Tabs-internal configuration. Paths read by other modules stay in config/:
  // defaults.js (MAX_USER_TABS), actionTypes.js and mutationCodes.js.

  const chrome = _tabChrome.tabs.strings;

  // Also registered on _KDB.elements.selectors.tabs.
  const selectors = {
    primaryTabButtonSelector: chrome.primaryTabButtonSelector,
    tabWrapperSelector: chrome.tabWrapperSelector,
    fallbackTabButtonSelector: chrome.fallbackTabButtonSelector,
    tabButtonItemSelector: chrome.tabButtonItemSelector,
    tabListSelector: chrome.tabListSelector,
    tabLabelSelectors: chrome.tabLabelSelectors,
    tabEditIconHostSelector: chrome.tabEditIconHostSelector,
    tabEditIconInsertAfterSelector: chrome.tabEditIconInsertAfterSelector,
    tabEditPseudoTabItemClass: chrome.tabEditPseudoTabItemClass,
    tabEditPseudoTabRole: chrome.tabEditPseudoTabRole,
    tabEditLabelContainerClass: chrome.tabEditLabelContainerClass,
    tabEditSvgIconClass: chrome.tabEditSvgIconClass,
    tabEditSubTitleClass: chrome.tabEditSubTitleClass,
    tabEditInputClass: chrome.tabEditInputClass,
    tabIndexAttribute: chrome.tabIndexAttribute,
    tabIndexBase: 0,
    tabIdAttribute: chrome.tabIdAttribute,
    pageIdAttribute: chrome.pageIdAttribute,
    activeSelectedAttribute: chrome.activeSelectedAttribute,
    activeSelectedValue: chrome.activeSelectedValue,
    activeClassNames: chrome.activeClassNames,
    activeTabSelector: "[" + chrome.activeSelectedAttribute + "='" + chrome.activeSelectedValue + "'], ." + chrome.activeClassNames.join(", ."),
    tabContentSelector: chrome.tabContentSelector
  };

  const filterScopeCodes = {
    NOT_READY: "TABS_FILTER_SCOPE_TARGETS_NOT_READY",
    RESOLVE_FAILED: "TABS_FILTER_SCOPE_TARGETS_FAILED",
    SCOPE_MISSING: "TABS_FILTER_SCOPE_TARGET_SCOPE_MISSING"
  };

  // Codes of the tabs parameterSet dispatch surface (contracts/tabs-parameterSetRestore-contractdelta.md §7).
  // WRITEBACK_* mirror the writeback enum by string value; TABS_* are owner-level only.
  const parameterSetCodes = {
    CANCELLED: "WRITEBACK_RESTORE_CANCELLED",
    NOT_READY: "WRITEBACK_TABS_NOT_READY",
    TARGET_MISSING: "WRITEBACK_TABS_TARGET_MISSING",
    SURPLUS_UNTOUCHED: "WRITEBACK_TABS_SURPLUS_UNTOUCHED",
    TRAVERSAL_FAILED: "WRITEBACK_TABS_TRAVERSAL_FAILED",
    MIN_VISIBLE_FORCED: "TABS_MIN_VISIBLE_FORCED",
    RENAME_FAILED: "TABS_RENAME_FAILED",
    LIVE_WIDGETS_READY_TIMEOUT: "TABS_LIVE_WIDGETS_READY_TIMEOUT"
  };

  // Owner modules the mutation saga dispatches to, per phase.
  const prepareOwners = Object.freeze(["widgetBase", "singleSelect", "dienststelle", "nativeMultiSelect"]);
  const filterOwners = Object.freeze(["singleSelect", "dienststelle", "nativeMultiSelect"]);
  const mutationOwners = Object.freeze({
    PREPARE_OWNERS: prepareOwners,
    FILTER_APPLY_OWNERS: filterOwners,
    RESYNC_OWNERS: filterOwners,
    ROLLBACK_OWNERS: prepareOwners,
    // Owners whose snapshot store the saga still releases through runtime.<owner>.tabMutationSnapshots.
    // widgetBase is not listed: its rollback data lives in the tabs slot-stock ledger.
    SNAPSHOT_OWNER_KEYS: filterOwners
  });

  // Edit-icon dialogs and failure texts per mutation. guardCode is the plan
  // guard whose failure is shown as a plain notice instead of an error alert.
  const mutationUi = {
    delete: {
      actionType: "tabs/delete",
      dialog: { method: "confirm", code: "TABS_DELETE_CONFIRM", title: _defaults.TAB_DELETE_CONFIRM_TITLE, message: _defaults.TAB_DELETE_CONFIRM_TEXT },
      guardCode: _mutationCodes.MIN_VISIBLE,
      guardText: _defaults.TAB_DELETE_MIN_VISIBLE_TEXT,
      failedTitle: _defaults.TAB_DELETE_FAILED_TITLE,
      failedVerb: "gelöscht"
    },
    duplicate: {
      actionType: "tabs/duplicate",
      dialog: { method: "confirm", code: "TABS_DUPLICATE_CONFIRM", title: _defaults.TAB_DUPLICATE_CONFIRM_TITLE, message: _defaults.TAB_DUPLICATE_CONFIRM_TEXT },
      guardCode: _mutationCodes.MAX_VISIBLE,
      guardText: _defaults.TAB_DUPLICATE_MAX_VISIBLE_TEXT,
      failedTitle: _defaults.TAB_DUPLICATE_FAILED_TITLE,
      failedVerb: "dupliziert"
    },
    move: {
      actionType: "tabs/move",
      dialog: { method: "choose", code: "TABS_MOVE_CHOOSE", title: _defaults.TAB_MOVE_CHOOSE_TITLE, message: _defaults.TAB_MOVE_CHOOSE_TEXT },
      guardCode: _mutationCodes.SAME_POSITION,
      guardText: _defaults.TAB_MOVE_CHOOSE_TEXT,
      failedTitle: _defaults.TAB_MOVE_FAILED_TITLE,
      failedVerb: "verschoben"
    }
  };

  // Rendered in this order next to the tab label during a rename session.
  const editIcons = [
    {
      key: "delete",
      wrapperClass: _defaults.EDIT_ICON_WRAPPER_CLOSE_CLASS,
      spanClass: _defaults.EDIT_ICON_SPAN_CLOSE_CLASS,
      extraClass: _defaults.EDIT_ICON_DELETE_CLASS,
      file: _defaults.EDIT_ICON_DELETE_FILE,
      title: _defaults.EDIT_ICON_DELETE_TITLE
    },
    {
      key: "duplicate",
      wrapperClass: _defaults.EDIT_ICON_WRAPPER_DUPLICATE_CLASS,
      spanClass: _defaults.EDIT_ICON_SPAN_DUPLICATE_CLASS,
      extraClass: _defaults.EDIT_ICON_DUPLICATE_CLASS,
      file: _defaults.EDIT_ICON_DUPLICATE_FILE,
      title: _defaults.EDIT_ICON_DUPLICATE_TITLE
    },
    {
      key: "move",
      wrapperClass: _defaults.EDIT_ICON_WRAPPER_MOVE_CLASS,
      spanClass: _defaults.EDIT_ICON_SPAN_MOVE_CLASS,
      extraClass: _defaults.EDIT_ICON_MOVE_CLASS,
      file: _defaults.EDIT_ICON_MOVE_FILE,
      title: _defaults.EDIT_ICON_MOVE_TITLE
    }
  ];

  return {
    selectors: selectors,
    filterScopeCodes: filterScopeCodes,
    parameterSetCodes: parameterSetCodes,
    mutationOwners: mutationOwners,
    mutationUi: mutationUi,
    editIcons: editIcons
  };
});

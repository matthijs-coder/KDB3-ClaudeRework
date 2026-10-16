define(["../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var CHROME = _filterDockChrome.filterDock.strings;

  var DOCK_SELECTOR_DEFAULTS = {
    filterItemSelector: CHROME.filterItemSelector,
    popupMountSelector: CHROME.popupMountSelector,
    optionSelector: CHROME.optionSelector,
    filterLabelSelector: CHROME.filterLabelSelector,
    filterDataIdAttr: CHROME.filterDataIdAttr,
    optionLabelSelector: CHROME.optionLabelSelector,
    alleOptionSelector: '[data-tid="KDB_singleSelect_AlleOption"]',
    nativeFooterSelector: CHROME.nativeFooterSelector,
    outClickCatcherSelector: CHROME.outClickCatcherSelector,
    okButtonSelector: CHROME.okButtonSelector,
    cancelButtonSelector: CHROME.cancelButtonSelector,
    clearButtonSelector: CHROME.clearButtonSelector,
    closeButtonSelector: CHROME.closeButtonSelector,
    roleOptionSelector: CHROME.roleOptionSelector,
    checkboxSelector: CHROME.checkboxSelector,
    selectedOptionClass: CHROME.selectedOptionClass,
    kdbSelectedOptionClass: "KDB_selectedOption",
    disabledButtonClass: CHROME.disabledButtonClass
  };

  var FILTERS_READY_STABILITY_MS = 500;
  var FILTERS_READY_MAX_WAIT_MS = 30000;
  var POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS = [0, 16, 50];
  var CHROME_WAIT_TIMEOUT_MS = 30000;

  var DOCK_OBSERVER_OPTIONS = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-disabled", "data-tid"]
  };

  var POPUP_DISPLAY_OBSERVER_OPTIONS = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "title"],
    characterData: true
  };

  var SPECIAL_SINGLE_SELECT_CONDITION_KEYS = ["personengruppe", "dienststellenleitung"];

  var CLASS_SINGLE_SELECT = "KDB_singleSelectFilter";
  var CLASS_CASCADING = "KDB_cascadingFilter";
  var CLASS_SICHT = "KDB_sichtSingleSelect";
  var CLASS_HIERARCHY = "KDB_hierarchyFilter";
  var CLASS_HIDE_ALLE = "KDB_hideAlleOption";

  var DETACH_INTERACTION_TYPES = { confirm: true, cancel: true, close: true, clear: true };
  var RESET_SESSION_INTERACTION_TYPES = { open: true, confirm: true, cancel: true, close: true };

  return {
    CHROME: CHROME,
    DOCK_SELECTOR_DEFAULTS: DOCK_SELECTOR_DEFAULTS,
    FILTERS_READY_STABILITY_MS: FILTERS_READY_STABILITY_MS,
    FILTERS_READY_MAX_WAIT_MS: FILTERS_READY_MAX_WAIT_MS,
    POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS: POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS,
    CHROME_WAIT_TIMEOUT_MS: CHROME_WAIT_TIMEOUT_MS,
    DOCK_OBSERVER_OPTIONS: DOCK_OBSERVER_OPTIONS,
    POPUP_DISPLAY_OBSERVER_OPTIONS: POPUP_DISPLAY_OBSERVER_OPTIONS,
    SPECIAL_SINGLE_SELECT_CONDITION_KEYS: SPECIAL_SINGLE_SELECT_CONDITION_KEYS,
    CLASS_SINGLE_SELECT: CLASS_SINGLE_SELECT,
    CLASS_CASCADING: CLASS_CASCADING,
    CLASS_SICHT: CLASS_SICHT,
    CLASS_HIERARCHY: CLASS_HIERARCHY,
    CLASS_HIDE_ALLE: CLASS_HIDE_ALLE,
    DETACH_INTERACTION_TYPES: DETACH_INTERACTION_TYPES,
    RESET_SESSION_INTERACTION_TYPES: RESET_SESSION_INTERACTION_TYPES
  };
});

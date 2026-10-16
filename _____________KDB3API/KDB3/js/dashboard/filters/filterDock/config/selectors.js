define(["../../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  return {
    filterItemSelector: chrome.filterItemSelector,
    popupMountSelector: chrome.popupMountSelector,
    optionSelector: chrome.optionSelector,
    filterLabelSelector: chrome.filterLabelSelector,
    filterDataIdAttr: chrome.filterDataIdAttr,
    optionLabelSelector: chrome.optionLabelSelector,
    alleOptionSelector: '[data-tid="KDB_singleSelect_AlleOption"]',
    nativeFooterSelector: chrome.nativeFooterSelector,
    outClickCatcherSelector: chrome.outClickCatcherSelector,
    okButtonSelector: chrome.okButtonSelector,
    cancelButtonSelector: chrome.cancelButtonSelector,
    clearButtonSelector: chrome.clearButtonSelector,
    closeButtonSelector: chrome.closeButtonSelector,
    roleOptionSelector: chrome.roleOptionSelector,
    checkboxSelector: chrome.checkboxSelector,
    selectedOptionClass: chrome.selectedOptionClass,
    kdbSelectedOptionClass: "KDB_selectedOption",
    disabledButtonClass: chrome.disabledButtonClass
  };
});

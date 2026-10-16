define(["../../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  return {
    rootClass: "KDB_sichtSingleSelect",
    disabledOptionClass: "KDB_sichtOptionDisabled",
    hideAlleOptionClass: "KDB_sichtHideAlle",
    selectedKdbOptionClass: "KDB_selectedOption",
    selectedOptionClass: chrome.selectedOptionClass,
    filterLabelSelector: chrome.filterLabelSelector,
    filterDataIdAttr: chrome.filterDataIdAttr,
    optionSelector: chrome.optionSelector,
    optionLabelSelector: chrome.optionLabelSelector,
    roleOptionSelector: chrome.roleOptionSelector,
    checkboxSelector: chrome.sichtCheckboxSelector,
    popupMountFallbackSelector: chrome.popupMountFallbackSelector
  };
});

define(["../../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  return {
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
});

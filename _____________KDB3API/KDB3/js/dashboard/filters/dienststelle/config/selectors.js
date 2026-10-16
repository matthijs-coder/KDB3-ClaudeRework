define(["../../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  return {
    filterDockRootSelector: chrome.rootSelector,
    globalDockBucketSelector: chrome.globalDockSelector,
    pageContextDockBucketSelector: chrome.pageContextDockSelector,
    filterItemWrapperClass: chrome.filterItemWrapperClass,
    filterDataIdAttr: chrome.filterDataIdAttr,
    filterDockFilterNameSelector: chrome.filterDockFilterNameSelector,
    markerClass: "KDB_dienststelle",
    activeClass: "KDB_dienststelle_active",
    rootActiveClassBySicht: {
      BW: "KDB_dienststelleActive_BW",
      DEZPV: "KDB_dienststelleActive_DEZPV"
    },
    rootActiveClassValues: ["KDB_dienststelleActive_BW", "KDB_dienststelleActive_DEZPV"],
    sichtClassByValue: {
      BW: "KDB_Sicht_BW",
      DEZPV: "KDB_Sicht_DEZPV"
    },
    popupMountSelector: chrome.popupMountSelector,
    popupLabelsReadyClass: "KDB_dienststelle_popupLabelsReady",
    listItemWrapperSelector: chrome.listItemWrapperSelector,
    optionLabelSelectors: chrome.optionLabelSelectors,
    committedDisplaySelector: chrome.committedDisplaySelector,
    committedDisplayParentSelector: chrome.committedDisplayParentSelector
  };
});

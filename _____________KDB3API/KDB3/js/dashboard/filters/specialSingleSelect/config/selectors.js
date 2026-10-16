define(["../../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  return {
    filterDockRootSelector: chrome.rootSelector,
    filterItemWrapperClass: chrome.filterItemWrapperClass,
    filterDataIdAttr: chrome.filterDataIdAttr,
    markerClass: "KDB_specialSingleSelect",
    rightClass: "KDB_SSS_right",
    alleOptionClass: "KDB_SSS_alleOption",
    rootSichtClassByValue: {
      BW: "KDB_sssSicht_BW",
      DEZPV: "KDB_sssSicht_DEZPV"
    },
    rootSichtClassValues: ["KDB_sssSicht_BW", "KDB_sssSicht_DEZPV"]
  };
});

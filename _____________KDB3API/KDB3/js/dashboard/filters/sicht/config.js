define(["../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  var ALLE_LABEL = "Alle";

  var SICHT_VARIANTS = {
    BW: {
      displayValue: "BW",
      optionTableKey: "sicht_bw",
      defaultTableKey: "dienststelle_bw_default",
      cssClass: "KDB_sichtOptionBw"
    },
    DEZPV: {
      displayValue: "DEZPV",
      optionTableKey: "sicht_dezpv",
      defaultTableKey: "dienststelle_dezpv_default",
      cssClass: "KDB_sichtOptionDezpv"
    }
  };

  // Option order is the startup-default priority.
  var VARIANT_KEYS = Object.keys(SICHT_VARIANTS);

  var VARIANT_BY_DISPLAY = Object.create(null);
  VARIANT_KEYS.forEach(function (key) {
    VARIANT_BY_DISPLAY[SICHT_VARIANTS[key].displayValue] = key;
  });

  var TABLE_KEYS = VARIANT_KEYS.map(function (key) {
    return SICHT_VARIANTS[key].optionTableKey;
  }).concat(VARIANT_KEYS.map(function (key) {
    return SICHT_VARIANTS[key].defaultTableKey;
  }));

  var SELECTORS = {
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

  // The global Sicht descriptor in singleSelect's inventory; exactly one must match.
  var LIVE_SICHT_QUERY = { scopeType: "global", status: "active", hostStatus: "present" };

  function commitFlags(isStartupDefault, isHistoryReplay, skipDownstreamVisibility) {
    return {
      isStartupDefault: isStartupDefault,
      isHistoryReplay: isHistoryReplay,
      skipDownstreamVisibility: skipDownstreamVisibility
    };
  }

  // Keys are the delegated commit sources; any other source is an interactive commit.
  var COMMIT_SOURCE_FLAGS = {
    sichtStartup: commitFlags(true, false, false),
    startup: commitFlags(true, false, false),
    startupDefault: commitFlags(true, false, false),
    parameterRestore: commitFlags(false, false, true),
    historyReplay: commitFlags(false, true, false)
  };
  var INTERACTIVE_COMMIT_FLAGS = commitFlags(false, false, false);

  return {
    ALLE_LABEL: ALLE_LABEL,
    SICHT_VARIANTS: SICHT_VARIANTS,
    VARIANT_KEYS: VARIANT_KEYS,
    VARIANT_BY_DISPLAY: VARIANT_BY_DISPLAY,
    TABLE_KEYS: TABLE_KEYS,
    SELECTORS: SELECTORS,
    LIVE_SICHT_QUERY: LIVE_SICHT_QUERY,
    COMMIT_SOURCE_FLAGS: COMMIT_SOURCE_FLAGS,
    INTERACTIVE_COMMIT_FLAGS: INTERACTIVE_COMMIT_FLAGS
  };
});

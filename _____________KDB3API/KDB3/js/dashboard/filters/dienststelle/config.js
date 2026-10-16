define([
  "../../../core/cognosHost/config/filterDockChromeSelectors.js",
  "../_core/tableDataWatcher.js"
], function (_filterDockChrome, _tableDataWatcher) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  var FILTER_KEYS = ["Dienststelle_BW", "Dienststelle_DEZPV"];

  var DEFINITIONS = {
    BW: {
      activeSichtValue: "BW",
      activeFilterKey: "Dienststelle_BW",
      visibleFilterLabel: "Dienststelle",
      defaultTableKey: "dienststelle_bw_default",
      hierarchyTableKey: "dienststelle_bw_hierarchy",
      shouldSanitizeOptionDisplay: false
    },
    DEZPV: {
      activeSichtValue: "DEZPV",
      activeFilterKey: "Dienststelle_DEZPV",
      visibleFilterLabel: "Dienststelle",
      defaultTableKey: "dienststelle_dezpv_default",
      hierarchyTableKey: "dienststelle_dezpv_hierarchy",
      shouldSanitizeOptionDisplay: true
    }
  };

  var LABELS = {
    emptyOkDefaultRequired: "Für den {filterName}-Filter ist mindestens eine Auswahl erforderlich. " +
      "Ohne Auswahl wird automatisch der voreingestellte Standardwert für die (aktuellen) Reiter gesetzt."
  };

  var PARAMETER_SET_CODES = Object.freeze({
    RESTORE_FAILED: "WRITEBACK_DIENSTSTELLE_RESTORE_FAILED",
    LABEL_MAPPED: "WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED",
    LABEL_UNMAPPED: "WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED",
    RESTORE_DISPLAY_DEGRADED: "WRITEBACK_DIENSTSTELLE_RESTORE_DISPLAY_DEGRADED",
    TARGET_MISSING: "WRITEBACK_TABS_TARGET_MISSING",
    CANCELLED: "WRITEBACK_RESTORE_CANCELLED",
    FILTER_CLEAR_FAILED: "WRITEBACK_FILTER_CLEAR_FAILED"
  });

  var DOM_SELECTORS = {
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
    popupMountSelector: chrome.popupMountSelector,
    popupLabelsReadyClass: "KDB_dienststelle_popupLabelsReady",
    listItemWrapperSelector: chrome.listItemWrapperSelector,
    optionLabelSelectors: chrome.optionLabelSelectors,
    committedDisplaySelector: chrome.committedDisplaySelector,
    committedDisplayParentSelector: chrome.committedDisplayParentSelector
  };

  var TABLE_KEYS = [
    "dienststelle_bw_default",
    "dienststelle_dezpv_default",
    "dienststelle_bw_hierarchy",
    "dienststelle_dezpv_hierarchy"
  ];

  // Fresh object per call: core writes tabMutationSnapshots in place.
  function createRuntimeDefaults() {
    return { parameterSetRunId: 0, tabMutationRunId: 0, tabMutationSnapshots: {} };
  }

  function resolveDefinition(_activeSichtValue) {
    var key = _activeSichtValue != null ? String(_activeSichtValue) : "";
    var entry = key && DEFINITIONS[key] ? DEFINITIONS[key] : null;
    return entry ? Object.assign({}, entry) : null;
  }

  function readTableConfig(_KDB, _tableKey) {
    return _KDB && _KDB.config && _KDB.config.tables ? _KDB.config.tables[_tableKey] : null;
  }

  var isRelevantTableName = _tableDataWatcher.createTableNameMatcher(TABLE_KEYS);

  function buildTableInput(_KDB, _tableKey) {
    var tableConfig = readTableConfig(_KDB, _tableKey);
    if (!tableConfig || typeof tableConfig !== "object") {
      return null;
    }
    return [{ tableName: _tableKey, shape: tableConfig.shape, pick: tableConfig.pick }];
  }

  return {
    FILTER_KEYS: FILTER_KEYS,
    DEFINITIONS: DEFINITIONS,
    LABELS: LABELS,
    PARAMETER_SET_CODES: PARAMETER_SET_CODES,
    DOM_SELECTORS: DOM_SELECTORS,
    createRuntimeDefaults: createRuntimeDefaults,
    resolveDefinition: resolveDefinition,
    isRelevantTableName: isRelevantTableName,
    buildTableInput: buildTableInput
  };
});

define([
  "../runtime.js",
  "../years.js",
  "../../../../core/config/visualizations/topNHelper.js"
], function (_visRuntime, _years, _topNHelper) {
  "use strict";

  function maxYearFromOutcome(_outcome) {
    try {
      var maxYear;
      var index;
      var year;
      if (!_outcome || _outcome.ok !== true || !Array.isArray(_outcome.data)) {
        return null;
      }
      maxYear = null;
      for (index = 0; index < _outcome.data.length; index += 1) {
        year = _years.parseYearFromCell(_outcome.data[index]);
        if (year != null && (maxYear == null || year > maxYear)) {
          maxYear = year;
        }
      }
      return maxYear;
    } catch (err) {
      console.error("[widgetVis.readDrillthroughJahrYear]", err);
      return null;
    }
  }

  function readActivePageId(_KDB) {
    var tabs = _KDB && _KDB.state ? _KDB.state.tabs : null;
    return tabs && (tabs.activeTabId || tabs.currentTabId) || null;
  }

  function __controller(_KDB, _metricsTable, _scopeId) {
    try {
      var filtersFacet = _visRuntime.readHostFacet(_KDB, "filtersFacet");
      var tableEntry = _topNHelper.resolveTableEntry(_metricsTable);
      var itemId = tableEntry && tableEntry.jahrColumnId;
      var pageId;
      var pageYear;
      if (!filtersFacet || typeof filtersFacet.readFilterValues !== "function" || !itemId) {
        return null;
      }
      if (_scopeId) {
        return readScopeYear(filtersFacet, itemId, _scopeId);
      }
      pageId = readActivePageId(_KDB);
      if (pageId) {
        pageYear = readScopeYear(filtersFacet, itemId, pageId);
        if (pageYear != null) {
          return pageYear;
        }
      }
      return readScopeYear(filtersFacet, itemId, "global");
    } catch (err) {
      console.error("[widgetVis.readDrillthroughJahrYear]", err);
      return null;
    }
  }

  function readScopeYear(_filtersFacet, _itemId, _scopeId) {
    try {
      return maxYearFromOutcome(_filtersFacet.readFilterValues({ itemId: _itemId, scopeId: _scopeId }));
    } catch (err) {
      console.error("[widgetVis.readDrillthroughJahrYear]", err);
      return null;
    }
  }

  return __controller;
});

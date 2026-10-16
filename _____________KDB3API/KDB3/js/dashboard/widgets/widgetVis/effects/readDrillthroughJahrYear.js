define([
  "./readFiltersFacet.js",
  "../../../../core/config/visualizations/topNHelper.js"
], function (_readFiltersFacet, _topNHelper) {
  "use strict";

  function parseYearFromCell(_raw) {
    try {
      var fields;
      var index;
      var text;
      var year;
      var match;
      if (_raw && typeof _raw === "object") {
        fields = [_raw.d, _raw.display, _raw.displayValue, _raw.u, _raw.use, _raw.useValue];
      } else {
        fields = [_raw];
      }
      for (index = 0; index < fields.length; index += 1) {
        if (fields[index] == null || fields[index] === "") {
          continue;
        }
        text = String(fields[index]);
        year = parseInt(text, 10);
        if (year >= 1900 && year <= 2100) {
          return year;
        }
        match = text.match(/(\d{4})/g);
        year = match ? parseInt(match[match.length - 1], 10) : NaN;
        if (year >= 1900 && year <= 2100) {
          return year;
        }
      }
      return null;
    } catch (err) {
      console.error("[widgetVis.readDrillthroughJahrYear]", err);
      return null;
    }
  }

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
        year = parseYearFromCell(_outcome.data[index]);
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
      var filtersFacet = _readFiltersFacet(_KDB);
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

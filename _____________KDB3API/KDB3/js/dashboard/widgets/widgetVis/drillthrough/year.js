define([
  "../runtime.js",
  "../years.js",
  "../../../tabs/state/selectors.js",
  "../../../../core/config/visualizations/topNHelper.js"
], function (_visRuntime, _years, _tabsSelectors, _topNHelper) {
  "use strict";

  function maxYearOfCells(_cells) {
    var maxYear = null;
    _cells.forEach(function (cell) {
      var year = _years.parseYearFromCell(cell);
      if (year != null && (maxYear == null || year > maxYear)) {
        maxYear = year;
      }
    });
    return maxYear;
  }

  function readScopeYear(_filtersFacet, _itemId, _scopeId) {
    try {
      var outcome = _filtersFacet.readFilterValues({ itemId: _itemId, scopeId: _scopeId });
      return outcome && outcome.ok === true && Array.isArray(outcome.data) ? maxYearOfCells(outcome.data) : null;
    } catch (err) {
      console.error("[widgetVis.readDrillthroughJahrYear] readFilterValues failed", _scopeId, err);
      return null;
    }
  }

  function readDrillthroughJahrYear(_KDB, _metricsTable, _scopeId) {
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
    pageId = _tabsSelectors.readActiveTabId(_KDB);
    if (pageId) {
      pageYear = readScopeYear(filtersFacet, itemId, pageId);
      if (pageYear != null) {
        return pageYear;
      }
    }
    return readScopeYear(filtersFacet, itemId, "global");
  }

  function findJahrColumnName(_columnNames) {
    var names = Array.isArray(_columnNames) ? _columnNames : [];
    var index;
    var lowered;
    for (index = 0; index < names.length; index += 1) {
      if (names[index] != null) {
        lowered = String(names[index]).toLowerCase();
        if (lowered.indexOf("jahr") !== -1 || lowered.indexOf("year") !== -1) {
          return names[index];
        }
      }
    }
    return null;
  }

  function maxYearFromTableRows(_rows) {
    var columnName = _rows && _rows.columns ? findJahrColumnName(_rows.columnNames) : null;
    var cells = columnName ? _rows.columns[columnName] : null;
    return Array.isArray(cells) ? maxYearOfCells(cells) : null;
  }

  function readDrillthroughVisYear(_KDB, _widgetId) {
    var facet = _visRuntime.readHostFacet(_KDB, "dataQueryFacet");
    var outcome;
    if (!facet || typeof facet.peekQueryRows !== "function") {
      return null;
    }
    try {
      outcome = facet.peekQueryRows(_widgetId);
    } catch (err) {
      console.error("[widgetVis.readDrillthroughVisYear] peekQueryRows failed", _widgetId, err);
      return null;
    }
    if (!outcome || typeof outcome.then === "function" || outcome.ok !== true || !outcome.data) {
      return null;
    }
    return maxYearFromTableRows(outcome.data);
  }

  return {
    readDrillthroughJahrYear: readDrillthroughJahrYear,
    readDrillthroughVisYear: readDrillthroughVisYear
  };
});

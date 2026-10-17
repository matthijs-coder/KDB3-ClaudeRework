define([
  "../drillthrough/year.js",
  "../runtime.js",
  "../years.js",
  "../../../tabs/selectors.js",
  "../../../../core/config/visualizations/topNHelper.js"
], function (_drillthroughYear, _visRuntime, _years, _tabsSelectors, _topNHelperConfig) {
  "use strict";

  var STICHTAG_UNAVAILABLE = "WIDGET_TOPN_STICHTAG_UNAVAILABLE";
  var RESULT_PICK_FALLBACK = ["d", "label", "caption", "value", "v", "u"];
  var CELL_FIELDS = ["d", "display", "label", "caption", "value", "v", "u"];

  function stichtagUnavailable(_errorMessage) {
    return {
      errorCode: STICHTAG_UNAVAILABLE,
      errorMessage: String(_errorMessage || "NewestStichtag period pin is unavailable.")
    };
  }

  function toStichtagFailure(_err) {
    if (_err && _err.errorCode === STICHTAG_UNAVAILABLE) {
      return _err;
    }
    return stichtagUnavailable(_err && (_err.errorMessage || _err.message) ? (_err.errorMessage || _err.message) : _err);
  }

  async function reloadNewestStichtag(_KDB) {
    var tableData = _KDB && _KDB.services && _KDB.services.tableData;
    var jahrFilter = _topNHelperConfig.jahrFilter || {};
    var tableName = jahrFilter.tableName || "newestStichtag";
    var pick = Array.isArray(_topNHelperConfig.resultPick) && _topNHelperConfig.resultPick.length ? _topNHelperConfig.resultPick : RESULT_PICK_FALLBACK;
    var input = [{ tableName: tableName, shape: "row", pick: pick }];
    var leftoverId;
    var widgetsFacet;
    var outcome;
    if (!tableData) {
      throw stichtagUnavailable("tableData.reloadTable is unavailable.");
    }
    await tableData.reloadTable(input);
    leftoverId = (tableData.readTableState([{ tableName: tableName }]) || {}).widgetId;
    if (!leftoverId) {
      throw stichtagUnavailable("NewestStichtag leftover widgetId is unavailable.");
    }
    widgetsFacet = _visRuntime.readHostFacet(_KDB, "widgetsFacet");
    if (!widgetsFacet || typeof widgetsFacet.renderWidget !== "function") {
      throw stichtagUnavailable("widgetsFacet.renderWidget is unavailable.");
    }
    outcome = await widgetsFacet.renderWidget(leftoverId);
    if (!outcome || outcome.ok !== true) {
      throw stichtagUnavailable("widgetsFacet.renderWidget is unavailable.");
    }
    return tableData.reloadTable(input);
  }

  function readPinRow(_reloadResult) {
    var first = Array.isArray(_reloadResult) ? _reloadResult[0] : null;
    var row = Array.isArray(first) ? (first[0] || null) : first;
    if (!row || typeof row !== "object") {
      throw stichtagUnavailable("NewestStichtag leftover widget is missing or returned no rows.");
    }
    return row;
  }

  function readCellText(_cell) {
    var index;
    var raw;
    if (_cell == null || _cell === "") {
      return "";
    }
    if (typeof _cell !== "object") {
      return String(_cell);
    }
    for (index = 0; index < CELL_FIELDS.length; index += 1) {
      raw = _cell[CELL_FIELDS[index]];
      if (raw != null && raw !== "") {
        return String(raw);
      }
    }
    return "";
  }

  // Stricter than years.parseYear: the text must start with exactly four digits and the result stays a string.
  function readLeadingYearText(_text) {
    var text = String(_text == null ? "" : _text).trim();
    var year;
    if (!/^\d{4}/.test(text) || (text.length > 4 && /\d/.test(text.charAt(4)))) {
      return null;
    }
    year = parseInt(text.slice(0, 4), 10);
    return year >= 1900 && year <= 2100 ? String(year) : null;
  }

  function canonicalMonth(_text, _monthMap) {
    var text = String(_text == null ? "" : _text).trim();
    var upper = text.toUpperCase();
    var keys;
    var index;
    if (!_monthMap || typeof _monthMap !== "object") {
      return null;
    }
    if (_monthMap[text] || _monthMap[upper]) {
      return _monthMap[text] || _monthMap[upper];
    }
    keys = Object.keys(_monthMap);
    for (index = 0; index < keys.length; index += 1) {
      if (String(_monthMap[keys[index]]).toUpperCase() === upper) {
        return _monthMap[keys[index]];
      }
    }
    return null;
  }

  function mapPeriodPin(_row) {
    var keys = Object.keys(_row);
    var year;
    var monthCaption;
    if (keys.length < 2) {
      throw stichtagUnavailable("NewestStichtag row does not have Jahr and Monat columns.");
    }
    year = readLeadingYearText(readCellText(_row[keys[0]]));
    if (!year) {
      throw stichtagUnavailable("NewestStichtag Jahr column is not a four-digit year.");
    }
    monthCaption = canonicalMonth(readCellText(_row[keys[1]]), _topNHelperConfig.monthCodeToCaption);
    if (!monthCaption) {
      throw stichtagUnavailable("NewestStichtag Monat column is not a known month caption.");
    }
    return {
      jahrFilterValue: { d: year, u: year },
      monatFilterValue: { d: String(monthCaption), u: String(monthCaption) }
    };
  }

  async function readNewestStichtagPin(_KDB) {
    try {
      return mapPeriodPin(readPinRow(await reloadNewestStichtag(_KDB)));
    } catch (err) {
      if (!err || err.errorCode !== STICHTAG_UNAVAILABLE) {
        console.error("[widgetVis.readNewestStichtagPin] failed", err);
      }
      throw toStichtagFailure(err);
    }
  }

  // Concurrent callers share one NewestStichtag read.
  function readSharedPin(_KDB) {
    var pending = _visRuntime.initializeRuntime(_KDB).pendingPromises;
    var started;
    if (!pending.periodPinRead) {
      started = readNewestStichtagPin(_KDB);
      pending.periodPinRead = started;
      started.then(function () {
        dropSharedRead(_KDB, started);
      }, function () {
        dropSharedRead(_KDB, started);
      });
    }
    return pending.periodPinRead;
  }

  function dropSharedRead(_KDB, _started) {
    var pending = _visRuntime.initializeRuntime(_KDB).pendingPromises;
    if (pending.periodPinRead === _started) {
      delete pending.periodPinRead;
    }
  }

  function resolveSelectedYear(_KDB, _metricsTable, _request) {
    var pageId;
    var pageYear;
    if (!_request || _request.selectedYearKnown !== true) {
      return _drillthroughYear.readDrillthroughJahrYear(_KDB, _metricsTable);
    }
    if (_request.scopeType === "pageContext") {
      if (_request.selectedYear != null) {
        return _request.selectedYear;
      }
      return _drillthroughYear.readDrillthroughJahrYear(_KDB, _metricsTable, "global");
    }
    pageId = _tabsSelectors.readActiveTabId(_KDB);
    if (pageId) {
      pageYear = _drillthroughYear.readDrillthroughJahrYear(_KDB, _metricsTable, pageId);
      if (pageYear != null) {
        return pageYear;
      }
    }
    return _request.selectedYear == null ? null : _request.selectedYear;
  }

  function storeSessionPin(_KDB, _pin) {
    _visRuntime.initializeRuntime(_KDB).sessionPeriodPin = _pin;
    return _pin;
  }

  function selectPin(_KDB, _metricsTable, _request, _pin) {
    var captionYear = Number(_pin && _pin.jahrFilterValue && _pin.jahrFilterValue.d);
    var selected;
    var december;
    if (!isFinite(captionYear)) {
      throw stichtagUnavailable("NewestStichtag caption year is not a number.");
    }
    selected = resolveSelectedYear(_KDB, _metricsTable, _request);
    if (selected == null || Number(selected) === captionYear) {
      return storeSessionPin(_KDB, _pin);
    }
    december = _topNHelperConfig.monthCodeToCaption && _topNHelperConfig.monthCodeToCaption["12"];
    if (!december) {
      throw stichtagUnavailable("monthCodeToCaption is missing 12.");
    }
    return storeSessionPin(_KDB, {
      jahrFilterValue: { d: String(selected), u: String(selected) },
      monatFilterValue: { d: december, u: december }
    });
  }

  // Rejects with {errorCode: "WIDGET_TOPN_STICHTAG_UNAVAILABLE", errorMessage} on any failure.
  async function applyTopNJahrMismatchPin(_KDB, _metricsTable, _request) {
    try {
      return selectPin(_KDB, _metricsTable, _request || {}, await readSharedPin(_KDB));
    } catch (err) {
      throw toStichtagFailure(err);
    }
  }

  function readYearFromValue(_value) {
    var fromDisplay;
    if (_value && typeof _value === "object") {
      fromDisplay = _years.parseYear(_value.d, { match: "first" });
      return fromDisplay != null ? fromDisplay : _years.parseYear(_value.u, { match: "first" });
    }
    return _years.parseYear(_value, { match: "first" });
  }

  function readConfirmedJahrYear(_values) {
    var maxYear = null;
    (Array.isArray(_values) ? _values : []).forEach(function (_value) {
      var year = readYearFromValue(_value);
      if (year != null && (maxYear == null || year > maxYear)) {
        maxYear = year;
      }
    });
    return maxYear;
  }

  return {
    applyTopNJahrMismatchPin: applyTopNJahrMismatchPin,
    readConfirmedJahrYear: readConfirmedJahrYear
  };
});

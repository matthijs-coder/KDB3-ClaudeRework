define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "./waitForQueryResult.js"
], function (_outcome, _errorCodes, _hostAccess, _waitForQueryResult) {
  "use strict";

  // readQueryRows (wait, then flatten) and peekQueryRows (sync, in-memory) return TableRowsResult
  // { columns, columnNames, rowCount }. Live host query handles stay inside ring 1.
  var CODES = _errorCodes.dataQuery;

  function extractCellValue(_cell) {
    if (_cell == null) {
      return { d: null, u: null };
    }
    if (Array.isArray(_cell)) {
      return extractMarkerValue(_cell[0]);
    }
    if (typeof _cell === "object") {
      return extractMarkerValue(_cell);
    }
    return { d: _cell, u: _cell, value: _cell, v: _cell, label: _cell, caption: _cell, primitive: _cell };
  }

  function extractMarkerValue(marker) {
    var cell;
    if (!marker) {
      return { d: null, u: null };
    }
    cell = {};
    copyMarkerValue(cell, marker, "d");
    copyMarkerValue(cell, marker, "u");
    copyMarkerValue(cell, marker, "value");
    copyMarkerValue(cell, marker, "v");
    copyMarkerValue(cell, marker, "label");
    copyMarkerValue(cell, marker, "caption");
    return cell;
  }

  function copyMarkerValue(cell, marker, key) {
    if (marker[key] != null) {
      cell[key] = marker[key];
    }
  }

  function readDataItemLabel(dataItem) {
    return dataItem && typeof dataItem.getLabel === "function" ? dataItem.getLabel() : null;
  }

  function getColumnName(_resultItem, _index) {
    var dataItemList;
    var labelParts;
    var index;
    var value;
    try {
      dataItemList = _resultItem && typeof _resultItem.getDataItemList === "function"
        ? _resultItem.getDataItemList()
        : [];
      labelParts = [];
      for (index = 0; index < dataItemList.length; index += 1) {
        value = readDataItemLabel(dataItemList[index]);
        if (value) {
          labelParts.push(value);
        }
      }
      return labelParts.length ? labelParts.join(" / ") : "col_" + _index;
    } catch (error) {
      return "col_" + _index;
    }
  }

  function getColumnNames(_resultItemList) {
    var used = {};
    var columnNames = [];
    var index;
    var label;
    var count;
    for (index = 0; index < _resultItemList.length; index += 1) {
      label = getColumnName(_resultItemList[index], index);
      count = used[label] || 0;
      used[label] = count + 1;
      columnNames.push(count === 0 ? label : label + "_" + (count + 1));
    }
    return columnNames;
  }

  function flattenQueryRows(_queryResult) {
    var resultItemList;
    var columnNames;
    var rowCount;
    var columns;
    var colIndex;
    var rowIndex;
    if (!_queryResult) {
      return null;
    }
    resultItemList = typeof _queryResult.getResultItemList === "function"
      ? _queryResult.getResultItemList()
      : [];
    if (!Array.isArray(resultItemList) || !resultItemList.length) {
      return null;
    }
    columnNames = getColumnNames(resultItemList);
    if (typeof _queryResult.getRowCount === "function") {
      rowCount = _queryResult.getRowCount();
    } else if (resultItemList[0] && typeof resultItemList[0].getRowCount === "function") {
      rowCount = resultItemList[0].getRowCount();
    } else {
      rowCount = 0;
    }
    columns = {};
    for (colIndex = 0; colIndex < resultItemList.length; colIndex += 1) {
      columns[columnNames[colIndex]] = new Array(rowCount);
    }
    for (rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (colIndex = 0; colIndex < resultItemList.length; colIndex += 1) {
        columns[columnNames[colIndex]][rowIndex] = extractCellValue(
          _queryResult.getValue(rowIndex, colIndex)
        );
      }
    }
    return { columns: columns, columnNames: columnNames, rowCount: rowCount };
  }

  function describeError(_error) {
    return _error && _error.message ? _error.message : String(_error);
  }

  function buildReadFailed(_code, _error) {
    return _outcome.buildFailed(_code, [_outcome.buildDiagnostic(_code, describeError(_error))]);
  }

  // { rows } or { failure } so both ops report a flatten error the same way.
  function flattenOrFail(_opName, _widgetId, _hostResult) {
    try {
      return { rows: flattenQueryRows(_hostResult) };
    } catch (flattenError) {
      console.error("[cognosHost.dataQuery." + _opName + "] flatten failed", { widgetId: _widgetId }, flattenError);
      return { failure: buildReadFailed(CODES.FLATTEN_FAILED, flattenError) };
    }
  }

  async function fetchHostResult(_ctx, _widgetId, _waitOutcome) {
    var resolved;
    if (_waitOutcome.data && _waitOutcome.data.hostResult) {
      return { hostResult: _waitOutcome.data.hostResult };
    }
    resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "dataQuery", "getDataQueryResult", CODES);
    if (resolved.failure) {
      return { failure: resolved.failure };
    }
    return { hostResult: await resolved.api.getDataQueryResult(_widgetId) };
  }

  async function readQueryRows(_ctx, _widgetId, _options) {
    var options = _options || {};
    var waitOutcome;
    var fetched;
    var flattened;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(options)) {
      return _outcome.buildAborted("aborted");
    }
    if (!_hostAccess.isValidWidgetId(_widgetId)) {
      return _outcome.buildFailed(CODES.INVALID_ID, []);
    }
    try {
      waitOutcome = await _waitForQueryResult(_ctx, _widgetId, options);
      if (_ctx.isDisposed()) {
        return _outcome.buildDisposed();
      }
      if (_hostAccess.isAborted(options)) {
        return _outcome.buildAborted("aborted-after-effect");
      }
      if (!waitOutcome || waitOutcome.ok !== true) {
        return waitOutcome;
      }
      fetched = await fetchHostResult(_ctx, _widgetId, waitOutcome);
      if (fetched.failure) {
        return fetched.failure;
      }
      if (_ctx.isDisposed()) {
        return _outcome.buildDisposed();
      }
      if (_hostAccess.isAborted(options)) {
        return _outcome.buildAborted("aborted-after-effect");
      }
      flattened = flattenOrFail("readQueryRows", _widgetId, fetched.hostResult);
      return flattened.failure || _outcome.buildOk(flattened.rows);
    } catch (error) {
      if (_hostAccess.isAborted(options) || (error && error.name === "AbortError")) {
        return _outcome.buildAborted("aborted");
      }
      console.error("[cognosHost.dataQuery.readQueryRows] failed", { widgetId: _widgetId }, error);
      return buildReadFailed(CODES.READ_FAILED, error);
    }
  }

  function peekQueryRows(_ctx, _widgetId) {
    var resolved;
    var hostResult;
    var flattened;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (!_hostAccess.isValidWidgetId(_widgetId)) {
      return _outcome.buildFailed(CODES.INVALID_ID, []);
    }
    try {
      resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "dataQuery", "peekCurrentQueryResult", CODES);
      if (resolved.failure) {
        return resolved.failure;
      }
      hostResult = resolved.api.peekCurrentQueryResult(_widgetId);
      if (hostResult == null || _hostAccess.isThenable(hostResult)) {
        return _outcome.buildOk(null);
      }
      flattened = flattenOrFail("peekQueryRows", _widgetId, hostResult);
      return flattened.failure || _outcome.buildOk(flattened.rows);
    } catch (error) {
      console.error("[cognosHost.dataQuery.peekQueryRows] failed", { widgetId: _widgetId }, error);
      return buildReadFailed(CODES.READ_FAILED, error);
    }
  }

  return {
    readQueryRows: readQueryRows,
    peekQueryRows: peekQueryRows
  };
});

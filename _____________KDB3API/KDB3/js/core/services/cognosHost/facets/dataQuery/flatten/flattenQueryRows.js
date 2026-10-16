define([], function () {
  "use strict";

  // Moved from tableData/effects/normalizeTableData.js. Live query handles stay
  // inside ring 1; owners receive TableRowsResult only.

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

  return flattenQueryRows;
});

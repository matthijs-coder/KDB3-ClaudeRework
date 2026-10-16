define([], function () {
  "use strict";

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
    if (!marker) {
      return { d: null, u: null };
    }
    const cell = {};
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
    try {
      const dataItemList =
        _resultItem && typeof _resultItem.getDataItemList === "function" ? _resultItem.getDataItemList() : [];
      const labelParts = [];
      for (let index = 0; index < dataItemList.length; index += 1) {
        const value = readDataItemLabel(dataItemList[index]);
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
    const used = {};
    const columnNames = [];
    for (let index = 0; index < _resultItemList.length; index += 1) {
      const label = getColumnName(_resultItemList[index], index);
      const count = used[label] || 0;
      used[label] = count + 1;
      columnNames.push(count === 0 ? label : label + "_" + (count + 1));
    }
    return columnNames;
  }

  function normalizeTableData(_queryResult) {
    try {
      if (!_queryResult) {
        return null;
      }
      const resultItemList =
        typeof _queryResult.getResultItemList === "function" ? _queryResult.getResultItemList() : [];
      if (!Array.isArray(resultItemList) || !resultItemList.length) {
        return null;
      }
      const columnNames = getColumnNames(resultItemList);
      const rowCount =
        typeof _queryResult.getRowCount === "function"
          ? _queryResult.getRowCount()
          : resultItemList[0] && typeof resultItemList[0].getRowCount === "function"
            ? resultItemList[0].getRowCount()
            : 0;
      const columns = {};
      for (let colIndex = 0; colIndex < resultItemList.length; colIndex += 1) {
        columns[columnNames[colIndex]] = new Array(rowCount);
      }
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        for (let colIndex = 0; colIndex < resultItemList.length; colIndex += 1) {
          columns[columnNames[colIndex]][rowIndex] = extractCellValue(_queryResult.getValue(rowIndex, colIndex));
        }
      }
      return { columns: columns, columnNames: columnNames, rowCount: rowCount };
    } catch (error) {
      // B4: een parse-crash is een faal, geen lege tabel — log + rethrow naar
      // het faalpad van runLoadTableWork. Echte lege resultaten (geen
      // resultItemList) blijven hierboven null teruggeven.
      console.error("[tableDataService.normalizeTableData] normalization failed", error);
      throw error;
    }
  }

  return normalizeTableData;
});

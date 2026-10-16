define(["./pickTableCell.js"], function (_pickTableCell) {
  "use strict";

  function shapeTableRows(rows, shape, pick) {
    try {
      if (rows == null) {
        return rows;
      }
      const source = normalizeSourceRows(rows);
      return shape === "column" ? shapeColumnRows(source, pick) : shapeRowRows(source, pick);
    } catch (error) {
      console.error("[tableDataService.shapeTableRows] failed", error);
      throw error;
    }
  }

  function normalizeSourceRows(rows) {
    if (rows && rows.columns && Array.isArray(rows.columnNames)) {
      return {
        columnNames: rows.columnNames.slice(),
        rowCount: typeof rows.rowCount === "number" ? rows.rowCount : readColumnRowCount(rows.columns, rows.columnNames),
        columns: rows.columns || {},
      };
    }
    if (Array.isArray(rows)) {
      return normalizeRowRows(rows);
    }
    return { columnNames: [], rowCount: 0, columns: {} };
  }

  function normalizeRowRows(rows) {
    const columnNames = [];
    const seen = {};
    const columns = {};
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || {};
      const keys = Object.keys(row);
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (seen[keys[keyIndex]] !== true) {
          seen[keys[keyIndex]] = true;
          columnNames.push(keys[keyIndex]);
          columns[keys[keyIndex]] = new Array(rows.length);
        }
      }
    }
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columnNames.length; columnIndex += 1) {
        const columnName = columnNames[columnIndex];
        columns[columnName][rowIndex] = rows[rowIndex] ? rows[rowIndex][columnName] : undefined;
      }
    }
    return { columnNames: columnNames, rowCount: rows.length, columns: columns };
  }

  function readColumnRowCount(columns, columnNames) {
    if (!columnNames.length) {
      return 0;
    }
    const column = columns ? columns[columnNames[0]] : null;
    return Array.isArray(column) ? column.length : 0;
  }

  function shapeRowRows(source, pick) {
    const shapedRows = [];
    for (let rowIndex = 0; rowIndex < source.rowCount; rowIndex += 1) {
      shapedRows.push(shapeRow(source.columns, source.columnNames, rowIndex, pick));
    }
    return shapedRows;
  }

  function shapeColumnRows(source, pick) {
    const columns = {};
    for (let columnIndex = 0; columnIndex < source.columnNames.length; columnIndex += 1) {
      const columnName = source.columnNames[columnIndex];
      const column = source.columns[columnName] || [];
      columns[columnName] = new Array(source.rowCount);
      for (let rowIndex = 0; rowIndex < source.rowCount; rowIndex += 1) {
        columns[columnName][rowIndex] = _pickTableCell(column[rowIndex], pick);
      }
    }
    return { columnNames: source.columnNames.slice(), rowCount: source.rowCount, columns: columns };
  }

  function shapeRow(columns, columnNames, rowIndex, pick) {
    const row = {};
    for (let columnIndex = 0; columnIndex < columnNames.length; columnIndex += 1) {
      const columnName = columnNames[columnIndex];
      const column = columns[columnName];
      row[columnName] = _pickTableCell(column ? column[rowIndex] : undefined, pick);
    }
    return row;
  }

  return shapeTableRows;
});

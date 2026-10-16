define(["../config/buildDienststelleTableDataInputs.js"], function (_tableDataInputs) {
  "use strict";

  function normalizeCell(_cell) {
    var display;
    var useValue;
    if (!_cell || typeof _cell !== "object" || Array.isArray(_cell)) {
      return null;
    }
    display =
      _cell.display != null
        ? String(_cell.display).trim()
        : _cell.d != null
          ? String(_cell.d).trim()
          : "";
    useValue =
      _cell.use != null ? String(_cell.use).trim() : _cell.u != null ? String(_cell.u).trim() : "";
    if (!display || !useValue) {
      return null;
    }
    return { displayValue: display, useValue: useValue, source: "default" };
  }

  function __controller(_KDB, _defaultTableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var rows;
    var row;
    var keys;
    var idx;
    var cell;
    if (!tableData || typeof tableData.readRows !== "function" || !_defaultTableKey) {
      return null;
    }
    tableInput = _tableDataInputs.buildTableInput(_KDB, _defaultTableKey);
    if (!tableInput) {
      return null;
    }
    rows = tableData.readRows(tableInput);
    if (!Array.isArray(rows) || !rows.length) {
      return null;
    }
    row = rows[0];
    keys = row && typeof row === "object" ? Object.keys(row) : [];
    for (idx = 0; idx < keys.length; idx += 1) {
      cell = normalizeCell(row[keys[idx]]);
      if (cell) {
        return cell;
      }
    }
    return null;
  }

  return __controller;
});

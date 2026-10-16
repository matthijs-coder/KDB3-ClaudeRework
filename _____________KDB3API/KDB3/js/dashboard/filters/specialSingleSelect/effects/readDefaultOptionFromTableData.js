define(["./buildSpecialTableDataInputs.js"], function (_buildSpecialTableDataInputs) {
  "use strict";

  function normalizeOptionCell(_cell) {
    var display;
    var useValue;
    if (!_cell || typeof _cell !== "object" || Array.isArray(_cell)) {
      return null;
    }
    display = _cell.display != null ? String(_cell.display).trim() : String(_cell.d || "").trim();
    useValue = _cell.use != null ? String(_cell.use).trim() : String(_cell.u || "").trim();
    if (!display || !useValue) {
      return null;
    }
    return { display: display, use: useValue };
  }

  function readFirstValidOptionRow(_KDB, _optionTableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var rows;
    var row;
    var keys;
    var idx;
    var option;
    if (!tableData || typeof tableData.readRows !== "function" || !_optionTableKey) {
      return { known: false, option: null };
    }
    tableInput = _buildSpecialTableDataInputs.buildTableInput(_KDB, _optionTableKey);
    if (!tableInput) {
      return { known: false, option: null };
    }
    rows = tableData.readRows(tableInput);
    if (!Array.isArray(rows) || !rows.length) {
      return { known: false, option: null };
    }
    row = rows[0];
    keys = row && typeof row === "object" ? Object.keys(row) : [];
    for (idx = 0; idx < keys.length; idx += 1) {
      option = normalizeOptionCell(row[keys[idx]]);
      if (option) {
        return { known: true, option: option };
      }
    }
    return { known: true, option: null };
  }

  return {
    readFirstValidOptionRow: readFirstValidOptionRow
  };
});

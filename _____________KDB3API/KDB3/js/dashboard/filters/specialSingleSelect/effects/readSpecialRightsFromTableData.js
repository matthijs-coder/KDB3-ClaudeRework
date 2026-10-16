define(["./buildSpecialTableDataInputs.js"], function (_buildSpecialTableDataInputs) {
  "use strict";

  function isRightAllowed(_rawValue) {
    return _rawValue === 1 || _rawValue === "1" || _rawValue === true;
  }

  function readFirstRowScalar(_rows) {
    var row;
    var keys;
    var cell;
    if (!Array.isArray(_rows) || !_rows.length) {
      return null;
    }
    row = _rows[0];
    if (!row || typeof row !== "object") {
      return null;
    }
    keys = Object.keys(row);
    if (!keys.length) {
      return null;
    }
    cell = row[keys[0]];
    if (cell && typeof cell === "object") {
      if (cell.use != null) {
        return cell.use;
      }
      if (cell.u != null) {
        return cell.u;
      }
      if (cell.d != null) {
        return cell.d;
      }
    }
    return cell;
  }

  function readRightFromTableData(_KDB, _tableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var rows;
    if (!tableData || typeof tableData.readRows !== "function" || !_tableKey) {
      return { known: false, allowed: false };
    }
    tableInput = _buildSpecialTableDataInputs.buildTableInput(_KDB, _tableKey);
    if (!tableInput) {
      return { known: false, allowed: false };
    }
    rows = tableData.readRows(tableInput);
    if (!Array.isArray(rows)) {
      return { known: false, allowed: false };
    }
    return { known: true, allowed: isRightAllowed(readFirstRowScalar(rows)) };
  }

  function readAlleRightFromTableData(_KDB) {
    return readRightFromTableData(_KDB, "alle");
  }

  return {
    isRightAllowed: isRightAllowed,
    readRightFromTableData: readRightFromTableData,
    readAlleRightFromTableData: readAlleRightFromTableData
  };
});

define([
  "./config.js",
  "../_core/tableDataWatcher.js",
  "../../../core/utils/isRightAllowed.js"
], function (_config, _tableDataWatcher, _isRightAllowed) {
  "use strict";

  function readTableConfig(_KDB, _tableKey) {
    return _KDB && _KDB.config && _KDB.config.tables ? _KDB.config.tables[_tableKey] : null;
  }

  var isRelevantTableName = _tableDataWatcher.createTableNameMatcher(_config.TABLE_KEYS);

  function buildTableInput(_KDB, _tableKey) {
    var tableConfig = readTableConfig(_KDB, _tableKey);
    if (!tableConfig || typeof tableConfig !== "object") {
      return null;
    }
    return [{ tableName: _tableKey, shape: tableConfig.shape, pick: tableConfig.pick }];
  }

  function readTableRows(_KDB, _tableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    if (!tableData || typeof tableData.readRows !== "function" || !_tableKey) {
      return undefined;
    }
    tableInput = buildTableInput(_KDB, _tableKey);
    return tableInput ? tableData.readRows(tableInput) : undefined;
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
    var rows = readTableRows(_KDB, _tableKey);
    if (!Array.isArray(rows)) {
      return { known: false, allowed: false };
    }
    return { known: true, allowed: _isRightAllowed(readFirstRowScalar(rows)) };
  }

  function readAlleRightFromTableData(_KDB) {
    return readRightFromTableData(_KDB, "alle");
  }

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
    var rows = readTableRows(_KDB, _optionTableKey);
    var row;
    var keys;
    var idx;
    var option;
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
    isRelevantTableName: isRelevantTableName,
    readRightFromTableData: readRightFromTableData,
    readAlleRightFromTableData: readAlleRightFromTableData,
    readFirstValidOptionRow: readFirstValidOptionRow
  };
});

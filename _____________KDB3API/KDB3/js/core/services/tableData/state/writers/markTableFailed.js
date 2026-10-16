define(["../initialTableState.js"], function (_initialTableState) {
  "use strict";

  function readString(_value) {
    const value = String(_value == null ? "" : _value).trim();
    return value || null;
  }

  function writeIdentity(entry, payload) {
    entry.tableHandle = readString(payload.tableHandle) || entry.tableHandle;
    entry.tableName = readString(payload.tableName) || entry.tableName;
    entry.title = readString(payload.title) || entry.title;
    entry.widgetId = readString(payload.widgetId) || entry.widgetId;
    entry.role = readString(payload.role) || entry.role;
    if (payload.isCoreTable === true) {
      entry.isCoreTable = true;
    }
  }

  function markTableFailed(_KDB, _payload) {
    const payload = _payload || {};
    const tableKey = readString(payload.tableKey);
    if (!_KDB || !tableKey) {
      return undefined;
    }
    _KDB.state = _KDB.state || {};
    _KDB.state.tableData = _KDB.state.tableData || {};
    const entry = _KDB.state.tableData[tableKey] || _initialTableState(payload);
    writeIdentity(entry, payload);
    entry.lifecycle = "error";
    entry.freshness = "stale";
    entry.errorCode = readString(payload.errorCode) || "TABLE_DATA_LOAD_FAILED";
    entry.errorMessage = readString(payload.errorMessage) || "Table data load failed.";
    _KDB.state.tableData[tableKey] = entry;
    return entry;
  }

  return markTableFailed;
});

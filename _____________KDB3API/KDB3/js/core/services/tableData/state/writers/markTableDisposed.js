define(["../initialTableState.js"], function (_initialTableState) {
  "use strict";

  function readString(_value) {
    const value = String(_value == null ? "" : _value).trim();
    return value || null;
  }

  function markOneTableDisposed(_KDB, tableKey) {
    const entry = _KDB.state.tableData[tableKey] || _initialTableState({ tableKey: tableKey });
    entry.lifecycle = "disposed";
    entry.freshness = "stale";
    _KDB.state.tableData[tableKey] = entry;
    return entry;
  }

  function markTableDisposed(_KDB, _payload) {
    const payload = _payload || {};
    if (!_KDB) {
      return undefined;
    }
    _KDB.state = _KDB.state || {};
    _KDB.state.tableData = _KDB.state.tableData || {};
    const tableKey = readString(payload.tableKey);
    if (tableKey) {
      return markOneTableDisposed(_KDB, tableKey);
    }
    const keys = Object.keys(_KDB.state.tableData);
    for (let index = 0; index < keys.length; index += 1) {
      markOneTableDisposed(_KDB, keys[index]);
    }
    return _KDB.state.tableData;
  }

  return markTableDisposed;
});

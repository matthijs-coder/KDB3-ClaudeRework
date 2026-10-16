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

  function markTableLoaded(_KDB, _payload) {
    const payload = _payload || {};
    const tableKey = readString(payload.tableKey);
    if (!_KDB || !tableKey) {
      return undefined;
    }
    _KDB.state = _KDB.state || {};
    _KDB.state.tableData = _KDB.state.tableData || {};
    const rows = payload.rows || null;
    const sourceRows = payload.sourceRows || null;
    const rowCount = typeof payload.rowCount === "number" ? payload.rowCount : readRowCount(sourceRows || rows);
    const entry = _KDB.state.tableData[tableKey] || _initialTableState(payload);
    writeIdentity(entry, payload);
    entry.lifecycle = "ready";
    entry.freshness = "fresh";
    entry.shape = payload.shape || "row";
    entry.pick = Array.isArray(payload.pick) ? copyPick(payload.pick) : ["display", "use"];
    entry.rows = rows;
    entry.sourceRows = sourceRows;
    entry.rowCount = rowCount;
    entry.isHierarchy = payload.isHierarchy === true;
    entry.hasData = payload.hasData === true;
    entry.errorCode = null;
    entry.errorMessage = null;
    entry.lastLoadedAt = Date.now();
    _KDB.state.tableData[tableKey] = entry;
    return entry;
  }

  function readRowCount(rows) {
    if (!rows) {
      return 0;
    }
    if (typeof rows.rowCount === "number") {
      return rows.rowCount;
    }
    if (Array.isArray(rows)) {
      return rows.length;
    }
    return 0;
  }

  function copyPick(pick) {
    const copied = [];
    for (let index = 0; index < pick.length; index += 1) {
      copied.push(copyPickItem(pick[index]));
    }
    return copied;
  }

  function copyPickItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }
    const copy = {};
    const keys = Object.keys(item);
    for (let index = 0; index < keys.length; index += 1) {
      copy[keys[index]] = item[keys[index]];
    }
    return copy;
  }

  return markTableLoaded;
});

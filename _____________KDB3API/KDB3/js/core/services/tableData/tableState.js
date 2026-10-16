define(["./config.js"], function (_config) {
  "use strict";

  function readString(value) {
    const text = String(value == null ? "" : value).trim();
    return text || null;
  }

  function copyPickItem(item) {
    return item && typeof item === "object" && !Array.isArray(item) ? Object.assign({}, item) : item;
  }

  function copyPick(pick) {
    return Array.isArray(pick) ? pick.map(copyPickItem) : _config.DEFAULT_PICK.slice();
  }

  function readRowCount(rows) {
    if (!rows) {
      return 0;
    }
    if (typeof rows.rowCount === "number") {
      return rows.rowCount;
    }
    return Array.isArray(rows) ? rows.length : 0;
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

  function initialTableState(input) {
    const source = input || {};
    const state = {
      lifecycle: "idle",
      freshness: "stale",
      tableHandle: readString(source.tableHandle),
      tableName: readString(source.tableName),
      title: readString(source.title),
      widgetId: readString(source.widgetId),
      role: readString(source.role),
      shape: source.shape || "row",
      pick: copyPick(source.pick),
      rows: null,
      sourceRows: null,
      rowCount: 0,
      isHierarchy: false,
      hasData: false,
      errorCode: null,
      errorMessage: null,
      lastLoadedAt: null,
    };
    if (source.isCoreTable === true) {
      state.isCoreTable = true;
    }
    return state;
  }

  // Finds or creates the entry for payload.tableKey and merges the identity fields; null without a key.
  function upsertEntry(_KDB, payload) {
    const tableKey = readString(payload.tableKey);
    if (!tableKey) {
      return null;
    }
    const entry = _KDB.state.tableData[tableKey] || initialTableState(payload);
    writeIdentity(entry, payload);
    _KDB.state.tableData[tableKey] = entry;
    return entry;
  }

  function markTableLoading(_KDB, _payload) {
    const payload = _payload || {};
    const entry = upsertEntry(_KDB, payload);
    if (!entry) {
      return undefined;
    }
    entry.lifecycle = "loading";
    entry.freshness = "stale";
    entry.shape = payload.shape || entry.shape || "row";
    entry.pick = Array.isArray(payload.pick) ? copyPick(payload.pick) : entry.pick || _config.DEFAULT_PICK.slice();
    entry.errorCode = null;
    entry.errorMessage = null;
    return entry;
  }

  function markTableLoaded(_KDB, _payload) {
    const payload = _payload || {};
    const entry = upsertEntry(_KDB, payload);
    if (!entry) {
      return undefined;
    }
    const rows = payload.rows || null;
    const sourceRows = payload.sourceRows || null;
    entry.lifecycle = "ready";
    entry.freshness = "fresh";
    entry.shape = payload.shape || "row";
    entry.pick = copyPick(payload.pick);
    entry.rows = rows;
    entry.sourceRows = sourceRows;
    entry.rowCount = typeof payload.rowCount === "number" ? payload.rowCount : readRowCount(sourceRows || rows);
    entry.isHierarchy = payload.isHierarchy === true;
    entry.hasData = payload.hasData === true;
    entry.errorCode = null;
    entry.errorMessage = null;
    entry.lastLoadedAt = Date.now();
    return entry;
  }

  function markTableFailed(_KDB, _payload) {
    const payload = _payload || {};
    const entry = upsertEntry(_KDB, payload);
    if (!entry) {
      return undefined;
    }
    entry.lifecycle = "error";
    entry.freshness = "stale";
    entry.errorCode = readString(payload.errorCode) || _config.LOAD_FAILED_CODE;
    entry.errorMessage = readString(payload.errorMessage) || _config.LOAD_FAILED_MESSAGE;
    return entry;
  }

  function markOneTableDisposed(_KDB, tableKey) {
    const entry = _KDB.state.tableData[tableKey] || initialTableState({ tableKey: tableKey });
    entry.lifecycle = "disposed";
    entry.freshness = "stale";
    _KDB.state.tableData[tableKey] = entry;
    return entry;
  }

  // Without payload.tableKey every known table is marked disposed.
  function markTableDisposed(_KDB, _payload) {
    const tableKey = readString((_payload || {}).tableKey);
    if (tableKey) {
      return markOneTableDisposed(_KDB, tableKey);
    }
    Object.keys(_KDB.state.tableData).forEach(function (key) {
      markOneTableDisposed(_KDB, key);
    });
    return _KDB.state.tableData;
  }

  return {
    readString: readString,
    readRowCount: readRowCount,
    initialTableState: initialTableState,
    markTableLoading: markTableLoading,
    markTableLoaded: markTableLoaded,
    markTableFailed: markTableFailed,
    markTableDisposed: markTableDisposed,
  };
});

define([
  "../input/resolveTableKey.js",
  "../effects/resolveTableWidgetId.js",
  "../effects/readParkedTableQueryResult.js",
  "../state/writers/markTableLoaded.js",
  "../state/writers/markTableFailed.js",
  "../events/eventNames.js",
  "./createTablePayload.js",
  "./shapeTableRows.js",
  "./clearRuntimeLoad.js",
], function (_resolveTableKey, _resolveTableWidgetId, _readParkedTableQueryResult, _markTableLoaded, _markTableFailed, _eventNames, _createTablePayload, _shapeTableRows, _clearRuntimeLoad) {
  "use strict";

  async function runLoadTableWork(_KDB, _input, signal) {
    const input = resolveTitleFromConfig(_KDB, _input);
    const tableKey = _resolveTableKey(input);
    try {
      const widgetId = await resolveWidgetId(_KDB, input);
      if (signal.aborted) {
        return null;
      }
      if (!tableKey || !widgetId) {
        return commitLoaded(_KDB, input, tableKey, widgetId, null);
      }
      const readResult = await _readParkedTableQueryResult(_KDB, widgetId, input, signal);
      if (signal.aborted || readResult.status === "aborted") {
        return null;
      }
      // B4: een gefaalde query committen we niet als lege success; het bestaande
      // faalpad (markTableFailed + tableData:loadFailed) neemt het over.
      if (readResult.status === "failed") {
        throw readResult.error || new Error("Table data query failed.");
      }
      return commitLoaded(_KDB, input, tableKey, widgetId, readResult.result || null);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        return null;
      }
      console.error("[tableDataService.runLoadTableWork] table load failed", error);
      const failedEntry = _markTableFailed(_KDB, failurePayload(input, tableKey, error));
      emitLoadFailed(_KDB, failedEntry);
      notifyLoadFailed(_KDB, failedEntry, tableKey);
      return Promise.reject(error);
    } finally {
      _clearRuntimeLoad(_KDB, tableKey);
    }
  }

  function resolveTitleFromConfig(_KDB, input) {
    if (!input.title && input.tableHandle && _KDB.config && _KDB.config.tables && _KDB.config.tables[input.tableHandle]) {
      input.title = readString(_KDB.config.tables[input.tableHandle].name) || input.title;
    }
    return input;
  }

  async function resolveWidgetId(_KDB, input) {
    const title = input.title || input.tableName;
    return input.widgetId || (title ? _resolveTableWidgetId(_KDB, title) : null);
  }

  function commitLoaded(_KDB, input, tableKey, widgetId, sourceRows) {
    const rows = _shapeTableRows(sourceRows, input.shape, input.pick);
    const entry = _markTableLoaded(_KDB, _createTablePayload(input, tableKey, widgetId, rows, sourceRows));
    clearNotifiedLoadFailure(_KDB, tableKey);
    emitLoadFinished(_KDB, entry);
    return sourceRows;
  }

  function failurePayload(input, tableKey, error) {
    return {
      tableKey: tableKey,
      tableHandle: input.tableHandle || tableKey,
      tableName: input.tableName || tableKey,
      title: input.title,
      widgetId: input.widgetId,
      role: input.role,
      isCoreTable: input.isCoreTable === true,
      errorCode: "TABLE_DATA_LOAD_FAILED",
      errorMessage: error && error.message ? error.message : String(error || "Table data load failed."),
    };
  }

  function emitLoadFinished(_KDB, _entry) {
    if (_KDB.events && typeof _KDB.events.emit === "function" && _entry) {
      _KDB.events.emit(_eventNames.LOAD_FINISHED, { tableName: _entry.tableName || _entry.tableHandle || _entry.title, rowCount: _entry.rowCount });
    }
  }

  function emitLoadFailed(_KDB, _entry) {
    if (_KDB.events && typeof _KDB.events.emit === "function" && _entry) {
      _KDB.events.emit(_eventNames.LOAD_FAILED, { tableName: _entry.tableName || _entry.tableHandle || _entry.title, errorCode: _entry.errorCode, errorMessage: _entry.errorMessage });
    }
  }

  // B2-kanaal (remediation): tabellen-laden-fouten waren voorheen alleen in de
  // console zichtbaar. Toast (geen modal): meerdere tabellen kunnen tegelijk falen.
  // D2: één toast per tableKey zolang dezelfde errorMessage aanhoudt.
  function notifyLoadFailed(_KDB, _entry, _tableKey) {
    const messageService = _KDB.services && _KDB.services.message;
    if (!messageService || typeof messageService.notify !== "function" || !_entry) { return; }
    try {
      const fingerprint = String(_entry.errorMessage || "");
      const failures = ensureNotifiedFailures(_KDB);
      if (_tableKey && failures[_tableKey] === fingerprint) { return; }
      messageService.notify({
        severity: "error",
        message: "Tabellendaten konnten nicht geladen werden: "
          + (_entry.title || _entry.tableName || _entry.tableHandle || "unbekannte Tabelle")
      });
      if (_tableKey) { failures[_tableKey] = fingerprint; }
    } catch (messageError) {
      console.warn("[tableDataService.runLoadTableWork] failure message failed", messageError);
    }
  }

  function ensureNotifiedFailures(_KDB) {
    if (!_KDB.runtime || !_KDB.runtime.tableData) { return {}; }
    _KDB.runtime.tableData.notifiedLoadFailures = _KDB.runtime.tableData.notifiedLoadFailures || {};
    return _KDB.runtime.tableData.notifiedLoadFailures;
  }

  function clearNotifiedLoadFailure(_KDB, _tableKey) {
    const failures = _KDB.runtime && _KDB.runtime.tableData && _KDB.runtime.tableData.notifiedLoadFailures;
    if (!failures || !_tableKey) { return; }
    delete failures[_tableKey];
  }

  function readString(_value) {
    const value = String(_value == null ? "" : _value).trim();
    return value || null;
  }

  function isAbortError(error) {
    return error && (error.name === "AbortError" || error.code === "ABORT_ERR");
  }

  return runLoadTableWork;
});

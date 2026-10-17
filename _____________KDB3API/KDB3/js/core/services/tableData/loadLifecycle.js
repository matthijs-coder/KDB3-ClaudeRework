define([
  "./config.js",
  "./events/eventNames.js",
  "./queryRead.js",
  "./resolveTableWidgetId.js",
  "./shapeTableRows.js",
  "./tableInputs.js",
  "./tableState.js",
], function (_config, _eventNames, _queryRead, _resolveTableWidgetId, _shapeTableRows, _tableInputs, _tableState) {
  "use strict";

  const resolveTableKey = _tableInputs.resolveTableKey;

  function clearRuntimeLoad(_KDB, tableKey) {
    if (tableKey) {
      delete _KDB.runtime.tableData.pendingLoads[tableKey];
      delete _KDB.runtime.tableData.abortControllers[tableKey];
    }
  }

  // A superseded load settles after its replacement registered; only the owner of the stored controller may clear.
  function releaseSettledLoad(_KDB, tableKey, signal) {
    const controller = _KDB.runtime.tableData.abortControllers[tableKey];
    if (!controller || controller.signal === signal) {
      clearRuntimeLoad(_KDB, tableKey);
    }
  }

  function abortTableLoad(_KDB, tableKey) {
    const controller = tableKey ? _KDB.runtime.tableData.abortControllers[tableKey] : null;
    if (controller && typeof controller.abort === "function") {
      controller.abort();
    }
    clearRuntimeLoad(_KDB, tableKey);
  }

  function abortAllLoads(_KDB) {
    Object.keys(_KDB.runtime.tableData.abortControllers).forEach(function (tableKey) {
      abortTableLoad(_KDB, tableKey);
    });
  }

  function createTablePayload(input, tableKey, widgetId, rows, sourceRows) {
    const rowCount = _tableState.readRowCount(sourceRows || rows);
    return {
      tableKey: tableKey,
      tableHandle: input.tableHandle || tableKey,
      tableName: input.tableName || tableKey,
      title: input.title,
      widgetId: widgetId || input.widgetId,
      role: input.role,
      isCoreTable: input.isCoreTable === true,
      shape: input.shape,
      pick: input.pick,
      rows: rows,
      sourceRows: sourceRows || null,
      rowCount: rowCount,
      isHierarchy: false,
      hasData: rowCount > 0,
    };
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
      errorCode: _config.LOAD_FAILED_CODE,
      errorMessage: error && error.message ? error.message : String(error || _config.LOAD_FAILED_MESSAGE),
    };
  }

  function emitTableEvent(_KDB, name, entry, extra) {
    if (_KDB.events && typeof _KDB.events.emit === "function" && entry) {
      _KDB.events.emit(name, Object.assign({ tableName: entry.tableName || entry.tableHandle || entry.title }, extra));
    }
  }

  function readLabel(_KDB, key) {
    const labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de ? _KDB.config.labels.de.tableData : null;
    return labels && typeof labels[key] === "string" ? labels[key] : _config.tableDataLabels[key];
  }

  // Toast, not modal: several tables can fail at once. One toast per table while the same error message persists.
  function notifyLoadFailed(_KDB, entry, tableKey) {
    const messageService = _KDB.services.message;
    if (!messageService || !entry) {
      return;
    }
    try {
      const fingerprint = String(entry.errorMessage || "");
      const failures = _KDB.runtime.tableData.notifiedLoadFailures;
      if (tableKey && failures[tableKey] === fingerprint) {
        return;
      }
      messageService.notify({
        severity: "error",
        message: readLabel(_KDB, "loadFailedToast") + (entry.title || entry.tableName || entry.tableHandle || readLabel(_KDB, "unknownTable")),
      });
      if (tableKey) {
        failures[tableKey] = fingerprint;
      }
    } catch (messageError) {
      console.warn("[tableDataService.runLoadTableWork] failure message failed", messageError);
    }
  }

  function commitLoaded(_KDB, input, tableKey, widgetId, sourceRows) {
    const rows = _shapeTableRows(sourceRows, input.shape, input.pick);
    const entry = _tableState.markTableLoaded(_KDB, createTablePayload(input, tableKey, widgetId, rows, sourceRows));
    delete _KDB.runtime.tableData.notifiedLoadFailures[tableKey];
    emitTableEvent(_KDB, _eventNames.LOAD_FINISHED, entry, { rowCount: entry && entry.rowCount });
    return sourceRows;
  }

  function reportLoadFailed(_KDB, input, tableKey, error) {
    console.error("[tableDataService.runLoadTableWork] table load failed", error);
    const entry = _tableState.markTableFailed(_KDB, failurePayload(input, tableKey, error));
    emitTableEvent(_KDB, _eventNames.LOAD_FAILED, entry, entry && { errorCode: entry.errorCode, errorMessage: entry.errorMessage });
    notifyLoadFailed(_KDB, entry, tableKey);
  }

  function resolveTitleFromConfig(_KDB, input) {
    const table = input.tableHandle && _KDB.config && _KDB.config.tables && _KDB.config.tables[input.tableHandle];
    if (!input.title && table) {
      input.title = _tableState.readString(table.name) || input.title;
    }
    return input;
  }

  async function resolveWidgetId(_KDB, input) {
    const title = input.title || input.tableName;
    return input.widgetId || (title ? _resolveTableWidgetId(_KDB, title) : null);
  }

  function isAbortError(error) {
    return !!error && (error.name === "AbortError" || error.code === "ABORT_ERR");
  }

  // Resolves with the raw source rows, or null when aborted. A failed query is committed as a failure, never as empty success.
  async function runLoadTableWork(_KDB, _input, signal) {
    const input = resolveTitleFromConfig(_KDB, _input);
    const tableKey = resolveTableKey(input);
    try {
      const widgetId = await resolveWidgetId(_KDB, input);
      if (signal.aborted) {
        return null;
      }
      if (!tableKey || !widgetId) {
        return commitLoaded(_KDB, input, tableKey, widgetId, null);
      }
      const readResult = await _queryRead.readParkedTableQueryResult(_KDB, widgetId, input, signal);
      if (signal.aborted || readResult.status === "aborted") {
        return null;
      }
      if (readResult.status === "failed") {
        throw readResult.error || new Error("Table data query failed.");
      }
      return commitLoaded(_KDB, input, tableKey, widgetId, readResult.result || null);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        return null;
      }
      reportLoadFailed(_KDB, input, tableKey, error);
      throw error;
    } finally {
      releaseSettledLoad(_KDB, tableKey, signal);
    }
  }

  function startTableLoad(_KDB, input, shouldAbortExisting) {
    const tableKey = resolveTableKey(input);
    const runtime = _KDB.runtime.tableData;
    if (!tableKey) {
      return Promise.resolve(null);
    }
    if (shouldAbortExisting) {
      abortTableLoad(_KDB, tableKey);
    } else if (runtime.pendingLoads[tableKey]) {
      return runtime.pendingLoads[tableKey];
    }
    const controller = new AbortController();
    runtime.abortControllers[tableKey] = controller;
    _tableState.markTableLoading(_KDB, createTablePayload(input, tableKey, input.widgetId, null));
    const pending = runLoadTableWork(_KDB, input, controller.signal);
    runtime.pendingLoads[tableKey] = pending;
    return pending;
  }

  return {
    startTableLoad: startTableLoad,
    abortTableLoad: abortTableLoad,
    abortAllLoads: abortAllLoads,
  };
});

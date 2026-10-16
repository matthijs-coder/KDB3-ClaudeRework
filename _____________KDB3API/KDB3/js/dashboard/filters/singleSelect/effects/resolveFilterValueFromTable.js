define([
  "../config/resolveFilterOptionsTableKey.js",
  "./parseFilterOptionTableRows.js"
], function (_resolveFilterOptionsTableKey, _parseFilterOptionTableRows) {
  "use strict";

  function buildTableInput(_KDB, _tableKey) {
    var tableConfig = _KDB && _KDB.config && _KDB.config.tables ? _KDB.config.tables[_tableKey] : null;
    if (!tableConfig || typeof tableConfig !== "object") {
      return null;
    }
    return [{ tableName: _tableKey, shape: tableConfig.shape, pick: tableConfig.pick }];
  }

  function buildLookupFailure(_errorCode, _tableKey, _source, _rowCount) {
    return {
      ok: false,
      errorCode: _errorCode,
      tableKey: _tableKey || "",
      selectedValue: null,
      rowCount: typeof _rowCount === "number" ? _rowCount : 0,
      source: _source || null
    };
  }

  function buildLookupSuccess(_tableKey, _selectedValue, _rowCount, _source) {
    return {
      ok: true,
      errorCode: null,
      tableKey: _tableKey,
      selectedValue: _selectedValue,
      rowCount: _rowCount,
      source: _source
    };
  }

  async function readConfiguredRows(_KDB, _tableInput) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var rows;
    if (!tableData || typeof tableData.readRows !== "function") {
      return { ok: false, errorCode: "tableDataUnavailable", rows: null, source: null };
    }
    rows = tableData.readRows(_tableInput);
    if (Array.isArray(rows)) {
      return { ok: true, rows: rows, source: "readRows" };
    }
    if (typeof tableData.waitForRows !== "function") {
      return { ok: false, errorCode: "tableNotReady", rows: null, source: null };
    }
    try {
      rows = await tableData.waitForRows(_tableInput);
      if (Array.isArray(rows)) {
        return { ok: true, rows: rows, source: "waitForRows" };
      }
    } catch (error) {
      console.warn("[singleSelect.resolveFilterValueFromTable] table wait failed",
        error && error.message ? error.message : String(error));
    }
    return { ok: false, errorCode: "tableNotReady", rows: null, source: null };
  }

  function readProvidedSelectionValue(_handoffContext, _pendingLabel) {
    var filterConfig;
    var selectionValuesByDisplay;
    var entry;
    var displayValue;
    var useValue;
    if (!_handoffContext || !_pendingLabel) {
      return null;
    }
    filterConfig = _handoffContext.filterConfig;
    if (!filterConfig || typeof filterConfig !== "object") {
      return null;
    }
    selectionValuesByDisplay = filterConfig.selectionValuesByDisplay;
    if (!selectionValuesByDisplay || typeof selectionValuesByDisplay !== "object") {
      return null;
    }
    entry = selectionValuesByDisplay[_pendingLabel];
    if (!entry || typeof entry !== "object") {
      return null;
    }
    displayValue = entry.d != null ? String(entry.d).trim() : "";
    useValue = entry.u != null ? String(entry.u).trim() : "";
    if (!displayValue || !useValue) {
      return null;
    }
    return { d: displayValue, u: useValue };
  }

  async function resolveFilterValueFromTable(_KDB, _filterLabel, _pendingLabel, _handoffContext) {
    var providedValue;
    var tableKey;
    var tableInput;
    var rowRead;
    var selectedValue;
    if (!_KDB || !_filterLabel || !_pendingLabel || _pendingLabel === "Alle") {
      return buildLookupFailure("invalidInput", "", null, 0);
    }
    providedValue = readProvidedSelectionValue(_handoffContext, _pendingLabel);
    if (providedValue) {
      return buildLookupSuccess("", providedValue, 0, "providedSelectionValues");
    }
    tableKey = _resolveFilterOptionsTableKey(_filterLabel);
    if (!tableKey) {
      return buildLookupFailure("tableKeyMissing", "", null, 0);
    }
    tableInput = buildTableInput(_KDB, tableKey);
    if (!tableInput) {
      return buildLookupFailure("tableConfigMissing", tableKey, null, 0);
    }
    rowRead = await readConfiguredRows(_KDB, tableInput);
    if (rowRead.ok !== true) {
      return buildLookupFailure(rowRead.errorCode, tableKey, rowRead.source, 0);
    }
    selectedValue = _parseFilterOptionTableRows.findMatchingRowValue(rowRead.rows, _pendingLabel, _filterLabel);
    if (!selectedValue) {
      return buildLookupFailure("labelNotFound", tableKey, rowRead.source, rowRead.rows.length);
    }
    return buildLookupSuccess(tableKey, selectedValue, rowRead.rows.length, rowRead.source);
  }

  return {
    resolveFilterValueFromTable: resolveFilterValueFromTable
  };
});

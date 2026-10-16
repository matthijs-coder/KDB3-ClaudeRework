define([], function () {
  "use strict";

  var EXPLICIT_TABLE_KEYS = {
    Berufsfamilie: "berufsfamilie_filter",
    Dienstverhältnis: "dienstverhältnis_filter",
    Geschlecht: "geschlecht_filter",
    Altersgruppe: "altersgruppe_filter",
    Personengruppe: "personengruppe_filter",
    Dienststellenleitung: "dienststellenleitung_filter"
  };

  function normalizeFilterLabelKey(_filterLabel) {
    return String(_filterLabel == null ? "" : _filterLabel)
      .trim()
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "");
  }

  function resolveFilterOptionsTableKey(_filterLabel) {
    var label = String(_filterLabel == null ? "" : _filterLabel).trim();
    if (!label) {
      return "";
    }
    if (Object.prototype.hasOwnProperty.call(EXPLICIT_TABLE_KEYS, label)) {
      return EXPLICIT_TABLE_KEYS[label];
    }
    return normalizeFilterLabelKey(label) + "_filter";
  }

  function normalizeText(_value) {
    return String(_value == null ? "" : _value).trim().toLowerCase();
  }

  function normalizeCell(_cell) {
    var display;
    var useValue;
    if (!_cell || typeof _cell !== "object" || Array.isArray(_cell)) {
      return null;
    }
    display =
      _cell.display != null
        ? String(_cell.display).trim()
        : _cell.d != null
          ? String(_cell.d).trim()
          : "";
    useValue =
      _cell.use != null ? String(_cell.use).trim() : _cell.u != null ? String(_cell.u).trim() : "";
    if (!display || !useValue) {
      return null;
    }
    return { display: display, use: useValue };
  }

  function readCellFromRow(_row, _filterLabel) {
    var keys;
    var idx;
    var cell;
    if (!_row || typeof _row !== "object") {
      return null;
    }
    keys = Object.keys(_row);
    for (idx = 0; idx < keys.length; idx += 1) {
      if (normalizeText(keys[idx]) === normalizeText(_filterLabel)) {
        return normalizeCell(_row[keys[idx]]);
      }
    }
    for (idx = 0; idx < keys.length; idx += 1) {
      cell = normalizeCell(_row[keys[idx]]);
      if (cell) {
        return cell;
      }
    }
    return null;
  }

  function findMatchingRowValue(_rows, _pendingLabel, _filterLabel) {
    var wanted = normalizeText(_pendingLabel);
    var idx;
    var cell;
    if (!Array.isArray(_rows) || !_rows.length) {
      return null;
    }
    for (idx = 0; idx < _rows.length; idx += 1) {
      cell = readCellFromRow(_rows[idx], _filterLabel);
      if (cell && normalizeText(cell.display) === wanted) {
        return { d: cell.display, u: cell.use };
      }
    }
    return null;
  }

  function findMatchingUseValue(_rows, _useValue, _filterLabel) {
    var wanted = String(_useValue == null ? "" : _useValue).trim();
    var matches = [];
    var idx;
    var cell;
    if (!wanted || !Array.isArray(_rows)) { return null; }
    for (idx = 0; idx < _rows.length; idx += 1) {
      cell = readCellFromRow(_rows[idx], _filterLabel);
      if (cell && cell.use === wanted) {
        matches.push({ d: cell.display, u: cell.use });
      }
    }
    return matches.length === 1 ? matches[0] : null;
  }

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
    tableKey = resolveFilterOptionsTableKey(_filterLabel);
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
    selectedValue = findMatchingRowValue(rowRead.rows, _pendingLabel, _filterLabel);
    if (!selectedValue) {
      return buildLookupFailure("labelNotFound", tableKey, rowRead.source, rowRead.rows.length);
    }
    return buildLookupSuccess(tableKey, selectedValue, rowRead.rows.length, rowRead.source);
  }

  return {
    resolveFilterOptionsTableKey: resolveFilterOptionsTableKey,
    findMatchingRowValue: findMatchingRowValue,
    findMatchingUseValue: findMatchingUseValue,
    resolveFilterValueFromTable: resolveFilterValueFromTable
  };
});

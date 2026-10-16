define([
  "./config.js",
  "./state.js",
  "../_core/tableDataWatcher.js"
], function (_config, _state, _tableDataWatcher) {
  "use strict";

  function evaluateAndStoreSichtOptions(_KDB, _dispatchInternal) {
    var availability = readSichtAvailabilityFromTableData(_KDB);
    var evaluated = evaluateSichtOptions(_KDB, availability);
    _dispatchInternal({
      type: _state.actions.SYNC_OPTIONS_EVALUATED,
      payload: { byOption: evaluated.byOption, evaluatedAt: evaluated.evaluatedAt }
    });
    return evaluated.byOption;
  }

  function evaluateSichtOptions(_KDB, _availability) {
    var byOption = {};
    var evaluatedAt = Date.now();
    var availability = _availability || {};

    _config.VARIANT_KEYS.forEach(function (_key) {
      var variant = _config.SICHT_VARIANTS[_key];
      var entry = availability[_key] || {};
      var isVisible = entry.isVisible === true;
      var isDefaultReady = entry.isDefaultReady === true;
      byOption[_key] = {
        displayValue: variant.displayValue,
        useValue: entry.useValue != null ? String(entry.useValue) : "",
        optionTableKey: variant.optionTableKey,
        defaultTableKey: variant.defaultTableKey,
        isVisible: isVisible,
        isDefaultReady: isDefaultReady,
        isEnabled: isVisible && isDefaultReady,
        lastSyncedAt: evaluatedAt
      };
    });

    return { byOption: byOption, evaluatedAt: evaluatedAt };
  }

  function readSichtAvailabilityFromTableData(_KDB) {
    var result = {};
    _config.VARIANT_KEYS.forEach(function (_key) {
      var variant = _config.SICHT_VARIANTS[_key];
      var optionAvailability = readOptionAvailability(_KDB, variant.optionTableKey);
      result[_key] = {
        known: optionAvailability.known,
        isVisible: optionAvailability.isVisible,
        isDefaultReady: optionAvailability.isVisible
          ? readDefaultReadiness(_KDB, variant.defaultTableKey)
          : false,
        useValue: optionAvailability.useValue
      };
    });
    return result;
  }

  function readOptionAvailability(_KDB, _optionTableKey) {
    var rows;
    var firstValidCell;
    rows = readTableRows(_KDB, _optionTableKey);
    if (rows === null) {
      return { known: false, isVisible: false, useValue: "" };
    }
    if (!rows.length) {
      return { known: true, isVisible: false, useValue: "" };
    }
    firstValidCell = readFirstValidCell(rows[0]);
    if (!firstValidCell) {
      return { known: true, isVisible: false, useValue: "" };
    }
    return {
      known: true,
      isVisible: true,
      useValue: firstValidCell.useValue
    };
  }

  function readDefaultReadiness(_KDB, _defaultTableKey) {
    var rows = readTableRows(_KDB, _defaultTableKey);
    return rows !== null && rows.length > 0;
  }

  function readTableRows(_KDB, _tableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var rows;
    if (!tableData || typeof tableData.readRows !== "function") {
      return null;
    }
    tableInput = buildTableInput(_KDB, _tableKey);
    if (!tableInput) {
      return null;
    }
    rows = tableData.readRows(tableInput);
    return Array.isArray(rows) ? rows : null;
  }

  function buildTableInput(_KDB, _tableKey) {
    var tableConfig =
      _KDB && _KDB.config && _KDB.config.tables ? _KDB.config.tables[_tableKey] : null;
    if (!tableConfig || typeof tableConfig !== "object") {
      return null;
    }
    return [{ tableName: _tableKey, shape: tableConfig.shape, pick: tableConfig.pick }];
  }

  function readFirstValidCell(_row) {
    var keys;
    var idx;
    var useValue;
    if (!_row || typeof _row !== "object") {
      return null;
    }
    keys = Object.keys(_row);
    for (idx = 0; idx < keys.length; idx += 1) {
      useValue = readUseValue(_row[keys[idx]]);
      if (useValue !== "") {
        return { useValue: useValue };
      }
    }
    return null;
  }

  function readUseValue(_cell) {
    if (_cell == null) {
      return "";
    }
    if (typeof _cell === "object" && !Array.isArray(_cell)) {
      if (_cell.use != null) {
        return String(_cell.use);
      }
      if (_cell.u != null) {
        return String(_cell.u);
      }
      if (_cell.d != null) {
        return String(_cell.d);
      }
      return "";
    }
    return String(_cell).trim() || "";
  }

  // The configured table names can change at runtime, so the matcher rebuilds its name set per event.
  var isRelevantTableName = _tableDataWatcher.createTableNameMatcher(_config.TABLE_KEYS);

  return {
    isRelevantTableName: isRelevantTableName,
    evaluateAndStoreSichtOptions: evaluateAndStoreSichtOptions,
    evaluateSichtOptions: evaluateSichtOptions,
    readSichtAvailabilityFromTableData: readSichtAvailabilityFromTableData
  };
});

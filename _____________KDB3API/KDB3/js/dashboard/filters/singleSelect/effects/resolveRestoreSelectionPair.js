define([
  "./readFilterDefinition.js",
  "../commit/tableValues.js",
  "../config.js"
], function (_readDefinition, _tableValues, _config) {
  "use strict";

  function readMapPair(_definition, _useValue) {
    var map = _definition && _definition.selectionValuesByDisplay;
    var keys = Object.keys(map || {});
    var matches = [];
    for (var i = 0; i < keys.length; i += 1) {
      var entry = map[keys[i]];
      if (entry && String(entry.u == null ? "" : entry.u) === _useValue && entry.d != null) {
        matches.push({ d: String(entry.d), u: _useValue });
      }
    }
    if (matches.length === 1) { return matches[0]; }
    return null;
  }

  function readDumpSingleton(_definition, _useValue) {
    if (_definition && String(_definition.useValue == null ? "" : _definition.useValue) === _useValue &&
      _definition.displayValue != null) {
      return { d: String(_definition.displayValue), u: _useValue };
    }
    return null;
  }

  async function readTablePair(_KDB, _instance, _useValue) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableKey = _tableValues.resolveFilterOptionsTableKey(_instance.filterLabel);
    var tableConfig = _KDB && _KDB.config && _KDB.config.tables
      ? _KDB.config.tables[tableKey] : null;
    if (!tableData || !tableConfig || typeof tableData.readRows !== "function") { return null; }
    var input = [{ tableName: tableKey, shape: tableConfig.shape, pick: tableConfig.pick }];
    var rows = tableData.readRows(input);
    if (!Array.isArray(rows) && typeof tableData.waitForRows === "function") {
      try {
        rows = await tableData.waitForRows(input);
      } catch (error) {
        console.warn("[singleSelect.resolveRestoreSelectionPair] table wait failed", {
          tableKey: tableKey
        }, error);
        return null;
      }
    }
    return _tableValues.findMatchingUseValue(rows, _useValue, _instance.filterLabel);
  }

  async function __controller(_KDB, _instance, _useValue) {
    try {
      var useValue = _useValue == null ? "" : String(_useValue);
      if (!useValue) {
        return { selection: { d: "Alle", u: "" }, degraded: false, diagnostic: null };
      }
      var definitionResult = _readDefinition(
        _KDB, null, _instance.scopeType, _instance.itemName, _instance.itemId
      );
      var mapPair = readMapPair(definitionResult.definition, useValue);
      if (mapPair) {
        return { selection: mapPair, degraded: false, diagnostic: null };
      }
      var tablePair = await readTablePair(_KDB, _instance, useValue);
      if (tablePair) {
        return { selection: tablePair, degraded: false, diagnostic: null };
      }
      var dumpPair = readDumpSingleton(definitionResult.definition, useValue);
      if (dumpPair) {
        return { selection: dumpPair, degraded: false, diagnostic: null };
      }
      return {
        selection: { d: useValue, u: useValue },
        degraded: true,
        diagnostic: {
          code: _config.errorCodes.RESTORE_DISPLAY_DEGRADED,
          filterInstanceId: _instance.filterInstanceId,
          message: "real display unavailable; transport-only d=u used before mandatory reread"
        }
      };
    } catch (error) {
      console.error("[singleSelect.resolveRestoreSelectionPair] failed", {
        filterInstanceId: _instance && _instance.filterInstanceId
      }, error);
      throw error;
    }
  }

  return __controller;
});

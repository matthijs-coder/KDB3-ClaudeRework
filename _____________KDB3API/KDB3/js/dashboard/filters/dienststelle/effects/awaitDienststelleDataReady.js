define(["../config/buildDienststelleTableDataInputs.js"], function (_tableDataInputs) {
  "use strict";

  function readTableLifecycle(_KDB, _tableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var tableState;
    if (!tableData || typeof tableData.readTableState !== "function" || !_tableKey) {
      return null;
    }
    tableInput = _tableDataInputs.buildTableInput(_KDB, _tableKey);
    if (!tableInput) {
      return null;
    }
    tableState = tableData.readTableState(tableInput);
    return tableState && tableState.lifecycle ? tableState.lifecycle : null;
  }

  function areKeysReady(_KDB, _keys) {
    var idx;
    for (idx = 0; idx < _keys.length; idx += 1) {
      if (readTableLifecycle(_KDB, _keys[idx]) !== "ready") {
        return false;
      }
    }
    return _keys.length > 0;
  }

  function buildInputs(_KDB, _keys) {
    var inputs = [];
    var idx;
    var tableInput;
    for (idx = 0; idx < _keys.length; idx += 1) {
      tableInput = _tableDataInputs.buildTableInput(_KDB, _keys[idx]);
      if (!tableInput) {
        return null;
      }
      inputs.push(tableInput[0]);
    }
    return inputs;
  }

  function resolveReadinessAfterWait(_KDB, _keys) {
    return areKeysReady(_KDB, _keys);
  }

  function resolveReadinessAfterFailure(_error) {
    console.error("[dienststelle.awaitDienststelleDataReady] waitForRows failed", _error);
    return false;
  }

  function __controller(_KDB, _keys, _options) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var keys = Array.isArray(_keys) ? _keys : [];
    var inputs;
    void _options;
    if (!keys.length) {
      return Promise.resolve(true);
    }
    if (areKeysReady(_KDB, keys)) {
      return Promise.resolve(true);
    }
    if (!tableData || typeof tableData.waitForRows !== "function") {
      return Promise.resolve(false);
    }
    inputs = buildInputs(_KDB, keys);
    if (!inputs) {
      return Promise.resolve(false);
    }
    // Altijd een array meegeven: normalizeTableInputs gooit op een kaal object,
    // waardoor elke 1-key-wait op een nog niet geladen tabel als false eindigde
    // (latent zolang eager loads de tabellen al ready hadden; fix 2026-08-20).
    return tableData
      .waitForRows(inputs)
      .then(resolveReadinessAfterWait.bind(null, _KDB, keys))
      .catch(resolveReadinessAfterFailure);
  }

  return __controller;
});

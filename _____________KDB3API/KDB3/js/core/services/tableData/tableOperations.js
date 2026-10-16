define([
  "./loadLifecycle.js",
  "./shapeTableRows.js",
  "./tableInputs.js",
  "./tableState.js",
  "./waitSignal.js",
], function (_loadLifecycle, _shapeTableRows, _tableInputs, _tableState, _waitSignal) {
  "use strict";

  const resolveTableKey = _tableInputs.resolveTableKey;
  const mapInputs = _tableInputs.mapInputs;
  const mapInputsAsync = _tableInputs.mapInputsAsync;

  function readTableEntry(_KDB, input) {
    const tableKey = resolveTableKey(input);
    return tableKey ? _KDB.state.tableData[tableKey] : undefined;
  }

  function isFresh(entry) {
    return !!entry && entry.lifecycle === "ready" && entry.freshness === "fresh";
  }

  function shapeFor(input) {
    return function (rows) {
      return _shapeTableRows(rows, input.shape, input.pick);
    };
  }

  // Serves a fresh entry from state, otherwise starts a load (aborting the one in flight when `force`).
  function loadOne(_KDB, input, force) {
    const entry = readTableEntry(_KDB, input);
    const rows = isFresh(entry) ? Promise.resolve(entry.sourceRows || entry.rows) : _loadLifecycle.startTableLoad(_KDB, input, force);
    return rows.then(shapeFor(input));
  }

  function loadTable(_KDB, inputs) {
    return mapInputsAsync(inputs, function (input) {
      return loadOne(_KDB, input, false);
    });
  }

  // Always an array, one entry per input (loadTable unwraps a single input).
  function loadTables(_KDB, inputs) {
    return Promise.all(inputs.map(function (input) {
      return loadOne(_KDB, input, false);
    }));
  }

  function ensureFreshRows(_KDB, inputs) {
    return mapInputsAsync(inputs, function (input) {
      return loadOne(_KDB, input, true);
    });
  }

  function reloadTable(_KDB, inputs) {
    return mapInputsAsync(inputs, function (input) {
      return _loadLifecycle.startTableLoad(_KDB, input, true).then(shapeFor(input));
    });
  }

  function readOrLoadRows(_KDB, input) {
    const tableKey = resolveTableKey(input);
    const pending = tableKey && _KDB.runtime.tableData.pendingLoads[tableKey];
    const entry = readTableEntry(_KDB, input);
    if (!pending && !(entry && entry.lifecycle === "ready")) {
      return loadOne(_KDB, input, false);
    }
    return (pending || Promise.resolve(entry.sourceRows || entry.rows)).then(shapeFor(input));
  }

  // Core tables wait for the configured-load registry so a read never races the boot loads.
  // options.signal ends the wait with an AbortError; the shared load is not aborted.
  function waitForRows(_KDB, inputs, options) {
    const signal = (options && options.signal) || null;
    if (_waitSignal.isAborted(signal)) {
      return Promise.reject(_waitSignal.createAbortError());
    }
    const waiting = mapInputsAsync(inputs, function (input) {
      const registryReady = _KDB.runtime.tableData.loadRegistryReady;
      if (input.isCoreTable === true && registryReady && typeof registryReady.then === "function") {
        return registryReady.then(function () {
          return readOrLoadRows(_KDB, input);
        });
      }
      return readOrLoadRows(_KDB, input);
    });
    return signal ? _waitSignal.raceAbort(waiting, signal) : waiting;
  }

  function readRows(_KDB, inputs) {
    return mapInputs(inputs, function (input) {
      const entry = readTableEntry(_KDB, input);
      return entry && entry.lifecycle === "ready" ? _shapeTableRows(entry.sourceRows || entry.rows, input.shape, input.pick) : undefined;
    });
  }

  function readTableState(_KDB, inputs) {
    return mapInputs(inputs, function (input) {
      return _tableState.viewTableState(readTableEntry(_KDB, input));
    });
  }

  function readPendingLoad(_KDB, inputs) {
    const tableKey = inputs.length === 1 ? resolveTableKey(inputs[0]) : null;
    const pending = tableKey ? _KDB.runtime.tableData.pendingLoads[tableKey] : null;
    return pending && typeof pending.then === "function" ? pending : null;
  }

  function abortTable(_KDB, inputs) {
    inputs.forEach(function (input) {
      _loadLifecycle.abortTableLoad(_KDB, resolveTableKey(input));
    });
  }

  function resolveConfiguredLoadInputs(tablesConfig) {
    const inputs = [];
    Object.keys(tablesConfig).forEach(function (tableKey) {
      const entry = tablesConfig[tableKey];
      if (entry && entry.load === true) {
        inputs.push({ tableName: tableKey, title: entry.name, role: entry.role, isCoreTable: true, shape: entry.shape, pick: entry.pick });
      }
    });
    return inputs;
  }

  // Boot loads are fire-and-forget: a failed load is already marked and reported by the load itself.
  function startConfiguredLoad(_KDB, input) {
    const normalized = _tableInputs.normalizeTableInputs([input]);
    loadTables(_KDB, normalized).catch(function (error) {
      console.warn("[tableDataService.registerConfiguredLoads] configured load failed", error);
    });
  }

  function registerConfiguredLoads(_KDB, tablesConfig) {
    const inputs = resolveConfiguredLoadInputs(tablesConfig || (_KDB.config && _KDB.config.tables) || {});
    const runtime = _KDB.runtime.tableData;
    runtime.loadRegistryReady = new Promise(function (resolve) {
      inputs.forEach(function (input) {
        startConfiguredLoad(_KDB, input);
      });
      resolve(inputs.map(function (input) {
        return input.tableName;
      }));
    });
    return runtime.loadRegistryReady;
  }

  return {
    loadTable: loadTable,
    loadTables: loadTables,
    reloadTable: reloadTable,
    ensureFreshRows: ensureFreshRows,
    waitForRows: waitForRows,
    readRows: readRows,
    readTableState: readTableState,
    readPendingLoad: readPendingLoad,
    abortTable: abortTable,
    registerConfiguredLoads: registerConfiguredLoads,
  };
});

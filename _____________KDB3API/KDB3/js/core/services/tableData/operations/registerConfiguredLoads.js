define([
  "./resolveConfiguredLoadInputs.js",
  "./loadTableInputs.js",
  "../input/normalizeTableInputs.js",
], function (_resolveConfiguredLoadInputs, _loadTableInputs, _normalizeTableInputs) {
  "use strict";

  function __controller(_KDB, _tablesConfig) {
    const tablesConfig = _tablesConfig || (_KDB.config && _KDB.config.tables) || {};
    const inputs = _resolveConfiguredLoadInputs(tablesConfig);
    const tableKeys = readTableKeys(inputs);
    const runtime = _KDB.runtime.tableData;
    let resolveRegistry;
    let rejectRegistry;

    runtime.loadRegistryReady = new Promise(function (resolve, reject) {
      resolveRegistry = resolve;
      rejectRegistry = reject;
    });
    runtime.loadRegistryReadyResolve = resolveRegistry;
    runtime.loadRegistryKeys = tableKeys.slice();

    try {
      registerLoadInputs(_KDB, inputs);
      resolveRegistry(tableKeys.slice());
      runtime.loadRegistryReadyResolve = null;
    } catch (error) {
      console.error("[tableDataService.registerConfiguredLoads] registry failed", error);
      runtime.loadRegistryReadyResolve = null;
      rejectRegistry(error);
    }

    return runtime.loadRegistryReady;
  }

  function registerLoadInputs(_KDB, inputs) {
    for (let index = 0; index < inputs.length; index += 1) {
      const loadPromise = _loadTableInputs(_KDB, [_normalizeTableInputs([inputs[index]])[0]]);
      // B4: gefaalde loads rejecten nu (fail-visible); de fout is dan al
      // gemarkeerd en gemeld door runLoadTableWork — hier alleen de
      // unhandled rejection van de fire-and-forget boot-loads voorkomen.
      Promise.resolve(loadPromise).catch(function (error) {
        console.warn("[tableDataService.registerConfiguredLoads] configured load failed", error);
      });
    }
  }

  function readTableKeys(inputs) {
    const tableKeys = [];
    for (let index = 0; index < inputs.length; index += 1) {
      tableKeys.push(inputs[index].tableName);
    }
    return tableKeys;
  }

  return __controller;
});

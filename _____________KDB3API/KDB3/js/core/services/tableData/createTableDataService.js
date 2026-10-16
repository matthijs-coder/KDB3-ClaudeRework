define([
  "./input/normalizeTableInputs.js",
  "./operations/loadTableInputs.js",
  "./operations/waitForRowsInputs.js",
  "./operations/reloadTableInputs.js",
  "./operations/ensureFreshRowsInputs.js",
  "./operations/registerConfiguredLoads.js",
  "./operations/abortAllLoads.js",
  "./state/writers/markTableDisposed.js",
  "./createTableDataReadApi.js",
], function (_normalizeTableInputs, _loadTableInputs, _waitForRowsInputs, _reloadTableInputs, _ensureFreshRowsInputs, _registerConfiguredLoads, _abortAllLoads, _markTableDisposed, _createTableDataReadApi) {
  "use strict";

  function createTableDataService(_KDB) {
    var life = { disposed: false };
    var reads = _createTableDataReadApi(_KDB, life);

    function loadTable(_input) {
      if (life.disposed) {
        return Promise.reject(new Error("tableDataService disposed"));
      }
      try {
        return _loadTableInputs(_KDB, _normalizeTableInputs(_input));
      } catch (error) {
        return rejectPublicMethodError("loadTable", error);
      }
    }

    function waitForRows(_input) {
      if (life.disposed) {
        return Promise.reject(new Error("tableDataService disposed"));
      }
      try {
        return _waitForRowsInputs(_KDB, _normalizeTableInputs(_input));
      } catch (error) {
        return rejectPublicMethodError("waitForRows", error);
      }
    }

    function reloadTable(_input) {
      if (life.disposed) {
        return Promise.reject(new Error("tableDataService disposed"));
      }
      try {
        return _reloadTableInputs(_KDB, _normalizeTableInputs(_input));
      } catch (error) {
        return rejectPublicMethodError("reloadTable", error);
      }
    }

    function ensureFreshRows(_input) {
      if (life.disposed) {
        return Promise.reject(new Error("tableDataService disposed"));
      }
      try {
        return _ensureFreshRowsInputs(_KDB, _normalizeTableInputs(_input));
      } catch (error) {
        return rejectPublicMethodError("ensureFreshRows", error);
      }
    }

    function registerConfiguredLoads(_tablesConfig) {
      if (life.disposed) {
        return Promise.reject(new Error("tableDataService disposed"));
      }
      try {
        return _registerConfiguredLoads(_KDB, _tablesConfig);
      } catch (error) {
        return rejectPublicMethodError("registerConfiguredLoads", error);
      }
    }

    function abortTable(_input) {
      if (life.disposed) return Promise.reject(new Error("tableDataService disposed"));
      try {
        _abortAllLoads.abortTableInputs(_KDB, _normalizeTableInputs(_input));
        return Promise.resolve();
      } catch (error) {
        return rejectPublicMethodError("abortTable", error);
      }
    }

    function destroy() {
      if (life.disposed) return;
      try {
        life.disposed = true;
        _abortAllLoads.abortAllLoads(_KDB);
        const timers = _KDB.runtime.tableData.timers || {};
        const timerKeys = Object.keys(timers);
        for (let index = 0; index < timerKeys.length; index += 1) {
          clearTimeout(timers[timerKeys[index]]);
        }
        _KDB.runtime.tableData.timers = {};
        _markTableDisposed(_KDB, {});
        _KDB.runtime.tableData.pendingLoads = {};
        _KDB.runtime.tableData.abortControllers = {};
        _KDB.runtime.tableData.subscriptions = {};
        _KDB.runtime.tableData.notifiedLoadFailures = {};
        _KDB.runtime.tableData.loadRegistryReadyResolve = null;
        _KDB.runtime.tableData.loadRegistryKeys = [];
        _KDB.runtime.tableData.loadRegistryReady = Promise.resolve([]);
      } catch (error) {
        handlePublicMethodError("destroy", error);
      }
    }

    return { loadTable: loadTable, readRows: reads.readRows, readPendingLoad: reads.readPendingLoad, waitForRows: waitForRows, reloadTable: reloadTable, ensureFreshRows: ensureFreshRows, readTableState: reads.readTableState, registerConfiguredLoads: registerConfiguredLoads, abortTable: abortTable, destroy: destroy };
  }

  function handlePublicMethodError(methodName, error, mode) {
    console.error("[tableDataService." + methodName + "] public method failed", error);
    if (mode === "reject") { return Promise.reject(error); }
    if (mode === "undefined") { return undefined; }
  }

  function rejectPublicMethodError(methodName, error) {
    return handlePublicMethodError(methodName, error, "reject");
  }

  return createTableDataService;
});

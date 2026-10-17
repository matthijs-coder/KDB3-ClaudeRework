define([
  "../../utils/kit/errors.js",
  "../../utils/kit/runtime.js",
  "./config.js",
  "./loadLifecycle.js",
  "./tableInputs.js",
  "./tableOperations.js",
  "./tableState.js",
], function (_errors, _runtime, _config, _loadLifecycle, _tableInputs, _operations, _tableState) {
  "use strict";

  const HOST_FACETS = ["canvas", "dataQuery", "visualization", "widgets"];
  const DISPOSED_MESSAGE = "tableDataService disposed";

  function stampHostFacets(_KDB, runtime) {
    const host = _KDB.services.cognosHost;
    HOST_FACETS.forEach(function (name) {
      runtime[name + "Facet"] = host && host[name] ? host[name] : null;
    });
  }

  function registerLabels(_KDB) {
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    const existing = _KDB.config.labels.de.tableData;
    _KDB.config.labels.de.tableData = Object.assign({}, _config.tableDataLabels, existing && typeof existing === "object" ? existing : {});
  }

  function resetRuntime(runtime) {
    runtime.pendingLoads = {};
    runtime.notifiedLoadFailures = {};
    runtime.loadRegistryReady = Promise.resolve([]);
    runtime.canvasWidgetsForLookup = null;
    runtime.canvasWidgetsForLookupPromise = null;
  }

  // mode "reject": failures and calls after destroy reject; mode "undefined": they return undefined.
  function createGuard(disposal, mode) {
    return function guarded(methodName, run) {
      return function (input, options) {
        if (disposal.isDisposed()) {
          return mode === "reject" ? Promise.reject(new Error(DISPOSED_MESSAGE)) : undefined;
        }
        try {
          return run(input, options);
        } catch (error) {
          console.error("[tableDataService." + methodName + "] public method failed", error);
          return mode === "reject" ? Promise.reject(error) : undefined;
        }
      };
    };
  }

  function createTableDataService(_KDB) {
    const disposal = _errors.createDisposedGuard("tableDataService");
    const guardAsync = createGuard(disposal, "reject");
    const guardSync = createGuard(disposal, "undefined");
    const normalize = _tableInputs.normalizeTableInputs;
    const runtime = _KDB.runtime.tableData;

    function destroy() {
      if (disposal.isDisposed()) {
        return;
      }
      disposal.dispose();
      try {
        _loadLifecycle.abortAllLoads(_KDB);
        _runtime.disposeRuntimeBuckets(runtime).forEach(function (error) {
          console.error("[tableDataService.destroy] runtime cleanup failed", error);
        });
        resetRuntime(runtime);
        _tableState.markTableDisposed(_KDB, {});
      } catch (error) {
        console.error("[tableDataService.destroy] public method failed", error);
      }
    }

    return {
      loadTable: guardAsync("loadTable", function (input) {
        return _operations.loadTable(_KDB, normalize(input));
      }),
      loadTables: guardAsync("loadTables", function (input) {
        return _operations.loadTables(_KDB, normalize(input));
      }),
      readRows: guardSync("readRows", function (input) {
        return _operations.readRows(_KDB, normalize(input));
      }),
      readPendingLoad: guardSync("readPendingLoad", function (input) {
        return _operations.readPendingLoad(_KDB, normalize(input));
      }),
      waitForRows: guardAsync("waitForRows", function (input, options) {
        return _operations.waitForRows(_KDB, normalize(input), options);
      }),
      reloadTable: guardAsync("reloadTable", function (input) {
        return _operations.reloadTable(_KDB, normalize(input));
      }),
      ensureFreshRows: guardAsync("ensureFreshRows", function (input) {
        return _operations.ensureFreshRows(_KDB, normalize(input));
      }),
      readTableState: guardSync("readTableState", function (input) {
        return input == null ? _tableState.viewAllTableStates(_KDB) : _operations.readTableState(_KDB, normalize(input));
      }),
      registerConfiguredLoads: guardAsync("registerConfiguredLoads", function (tablesConfig) {
        return _operations.registerConfiguredLoads(_KDB, tablesConfig);
      }),
      abortTable: guardAsync("abortTable", function (input) {
        _operations.abortTable(_KDB, normalize(input));
        return Promise.resolve();
      }),
      destroy: destroy,
    };
  }

  // Lifecycle terms: lifecycle idle | loading | ready | error | disposed; freshness fresh | stale.
  function registerTableData(_KDB) {
    _KDB.state.tableData = _KDB.state.tableData || {};
    const runtime = _runtime.ensureRuntime(_KDB, "tableData", {
      pendingLoads: {},
      notifiedLoadFailures: {},
      loadRegistryReady: Promise.resolve([]),
      canvasWidgetsForLookup: null,
      canvasWidgetsForLookupPromise: null,
    });
    stampHostFacets(_KDB, runtime);
    registerLabels(_KDB);
    _KDB.services.tableData = createTableDataService(_KDB);
    _KDB.services.tableData.registerConfiguredLoads().catch(function (error) {
      console.error("[tableDataService.registerConfiguredLoads] startup registry failed", error);
    });
    return _KDB.services.tableData;
  }

  return registerTableData;
});

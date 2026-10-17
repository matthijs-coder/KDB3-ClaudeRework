define([
  "./state.js",
  "./config.js",
  "./selectors.js",
  "./history.js",
  "./tabMutation.js",
  "./restore/parameterSet.js",
  "./effects/dispatchRoute.js",
  "./effects/hierarchySnapshot.js",
  "./effects/reconcile/runReconcile.js",
  "../_core/ownerController.js",
  "../_core/tableDataWatcher.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/history.js"
], function (
  _state,
  _config,
  _selectors,
  _history,
  _tabMutation,
  _parameterSet,
  _dispatchRoute,
  _hierarchySnapshot,
  _runReconcile,
  _ownerController,
  _tableDataWatcher,
  _kitRuntime,
  _kitErrors,
  _kitHistory
) {
  "use strict";

  var REPLAY_KEYS = ["filter_dienststelle"];

  // Lifecycle terms for dienststelle: idle, ready, error, disposed.
  var ACTIONS = _state.ACTIONS;

  function ensureDienststelleRuntime(_KDB) {
    return _kitRuntime.ensureRuntime(_KDB, "dienststelle", _config.createRuntimeDefaults());
  }

  // cognosHost is registered as the first core service, so the facets exist by the time this module
  // registers; the guard covers a harness without services.
  function readHostFacet(_KDB, _name) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service[_name] ? service[_name] : null;
  }

  function disposedTabMutationResult(_action) {
    return _tabMutation.disposedResult(_action.payload);
  }

  var DISPOSED_RESULTS = {};
  DISPOSED_RESULTS[ACTIONS.PARAMETER_SET_CLEAR_REQUESTED] = _parameterSet.disposedResult;
  DISPOSED_RESULTS[ACTIONS.PARAMETER_SET_RESTORE_REQUESTED] = _parameterSet.disposedResult;
  DISPOSED_RESULTS[ACTIONS.PREPARE_TAB_MUTATION] = disposedTabMutationResult;
  DISPOSED_RESULTS[ACTIONS.APPLY_TAB_MUTATION] = disposedTabMutationResult;
  DISPOSED_RESULTS[ACTIONS.RESTORE_TAB_MUTATION_SNAPSHOT] = disposedTabMutationResult;
  DISPOSED_RESULTS[ACTIONS.RESYNC_TAB_MUTATION_HOST] = disposedTabMutationResult;

  function createDienststelleController(_deps) {
    var controller = {
      _KDB: _deps._KDB,
      filtersFacet: _deps.filtersFacet || null,
      options: _deps.options || {},
      runtime: null
    };
    var guard = _kitErrors.createDisposedGuard("dienststelle");
    var dispatchInternal = _ownerController.createStateWriter(controller._KDB, "dienststelle", _state.reduceDienststelle);
    var api;

    function reportError(_error) {
      dispatchInternal({
        type: ACTIONS.ERROR,
        payload: {
          errorCode: "DIENSTSTELLE_DISPATCH_FAILED",
          errorMessage: String(_error && _error.message ? _error.message : _error)
        }
      });
    }

    function dispatchPublic(_action) {
      return api.dispatch(_action);
    }

    function buildTableDataPayload(_tableName, _eventPayload) {
      return { tableName: _tableName, rowCount: _eventPayload.rowCount, source: "tableData" };
    }

    function mount(_options) {
      controller.runtime = ensureDienststelleRuntime(controller._KDB);
      controller.options = Object.assign({}, controller.options, _options || {});
      dispatchInternal({ type: ACTIONS.MOUNT_READY, payload: { mountedAt: Date.now() } });
      _tableDataWatcher.watchTableData(controller._KDB, {
        runtime: controller.runtime,
        isRelevant: _config.isRelevantTableName,
        dispatch: dispatchPublic,
        actionType: ACTIONS.TABLE_DATA_CHANGED,
        buildPayload: buildTableDataPayload
      });
    }

    function teardown() {
      var runtime = controller.runtime || controller._KDB.runtime.dienststelle;
      if (runtime) {
        _kitRuntime.disposeRuntimeBuckets(runtime).forEach(function (error) {
          console.warn("[dienststelle.destroy] runtime release failed", error);
        });
        runtime.tabMutationRunId = 0;
        runtime.tabMutationSnapshots = {};
      }
    }

    function dispatchRouted(_action) {
      var routePromise = _dispatchRoute.routeDienststelleDispatch(
        controller,
        dispatchInternal,
        _runReconcile.reconcileConfirmed,
        _action
      );
      if (_action.type === ACTIONS.HISTORY_REPLAY_REQUESTED) {
        return routePromise
          .then(function (_result) {
            return _result === true;
          })
          .catch(function (_error) {
            reportError(_error);
            return false;
          });
      }
      routePromise.catch(reportError);
      return _selectors.readDienststelleState(controller._KDB);
    }

    function route(_action) {
      if (_parameterSet.isParameterSetAction(_action.type)) {
        return _parameterSet.routeParameterSetAction(
          _parameterSet.createParameterSetContext(controller, dispatchPublic, dispatchInternal),
          _action
        );
      }
      if (_tabMutation.isTabMutationAction(_action.type)) {
        // No filtersFacet on purpose: the tab-mutation effects resolve it through the module's host
        // choke point (contracts/cognosHostService.md section 7).
        return _tabMutation.routeTabMutationAction({
          _KDB: controller._KDB,
          runtime: controller.runtime || ensureDienststelleRuntime(controller._KDB),
          dispatchInternal: dispatchInternal
        }, _action);
      }
      return dispatchRouted(_action);
    }

    api = Object.assign(_ownerController.createOwnerController({
      _KDB: controller._KDB,
      name: "dienststelle",
      guard: guard,
      reduce: dispatchInternal,
      mount: mount,
      teardown: teardown,
      route: route,
      destroyAction: ACTIONS.DESTROY,
      clearsReplayContribution: true,
      disposedResults: DISPOSED_RESULTS,
      onDispatchError: reportError
    }), {
      getCurrentHierarchySnapshot: function getCurrentHierarchySnapshot(_options) {
        return guard.isDisposed() ? undefined : _hierarchySnapshot.readCurrentHierarchySnapshot(controller._KDB, _options);
      }
    });
    return api;
  }

  function registerDienststelle(_KDB, _options) {
    var runtime;
    var controllerApi;
    _ownerController.prepareOwnerNamespaces(_KDB, "dienststelle", { createInitialState: _state.createInitialState });
    runtime = ensureDienststelleRuntime(_KDB);
    runtime.tabsFacet = readHostFacet(_KDB, "tabs");

    try {
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
      _KDB.config.labels.de.dienststelle = Object.assign({}, _config.LABELS, _KDB.config.labels.de.dienststelle || {});
    } catch (err) {
      console.error("[dienststelle.register] labels merge failed", err);
    }

    runtime.historyReplayHandlerContribution = _kitHistory.createReplayHandler({
      filter_dienststelle: _history.applyReplay
    });
    _kitHistory.registerReplayKeys(_KDB, REPLAY_KEYS, runtime.historyReplayHandlerContribution);
    controllerApi = createDienststelleController({
      _KDB: _KDB,
      filtersFacet: readHostFacet(_KDB, "filters"),
      options: _options || {}
    });
    _KDB.api.dienststelle = controllerApi;
    return controllerApi;
  }

  return registerDienststelle;
});

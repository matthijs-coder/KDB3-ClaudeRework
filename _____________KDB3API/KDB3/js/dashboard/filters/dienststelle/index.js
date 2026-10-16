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
  "../../../core/services/tableData/events/eventNames.js",
  "../../../core/utils/kit/data.js",
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
  _tableDataEvents,
  _kitData,
  _kitRuntime,
  _kitErrors,
  _kitHistory
) {
  "use strict";

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

  function subscribeTableDataChanges(_KDB, _api) {
    var events = _KDB && _KDB.events;
    if (!events || typeof events.subscribe !== "function") {
      return null;
    }
    return events.subscribe(_tableDataEvents.LOAD_FINISHED, function (_payload) {
      var tableName = _payload && _payload.tableName;
      if (!_config.isRelevantTableName(_KDB, tableName)) {
        return;
      }
      _api.dispatch({
        type: ACTIONS.TABLE_DATA_CHANGED,
        payload: { tableName: tableName, rowCount: _payload.rowCount, source: "tableData" }
      });
    });
  }

  function createDienststelleController(_deps) {
    var controller = {
      _KDB: _deps._KDB,
      filtersFacet: _deps.filtersFacet || null,
      options: _deps.options || {},
      runtime: null
    };
    var guard = _kitErrors.createDisposedGuard("dienststelle");
    var api;

    function dispatchInternal(_action) {
      var filtersState = controller._KDB.state && controller._KDB.state.filters;
      if (filtersState) {
        filtersState.dienststelle = _state.reduceDienststelle(filtersState.dienststelle, _action);
      }
    }

    function reportError(_error) {
      dispatchInternal({
        type: ACTIONS.ERROR,
        payload: {
          errorCode: "DIENSTSTELLE_DISPATCH_FAILED",
          errorMessage: String(_error && _error.message ? _error.message : _error)
        }
      });
    }

    function mount(_options) {
      var existingUnsubscribe;
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        controller.runtime = ensureDienststelleRuntime(controller._KDB);
        controller.options = Object.assign({}, controller.options, _options || {});
        dispatchInternal({ type: ACTIONS.MOUNT_READY, payload: { mountedAt: Date.now() } });
        existingUnsubscribe = controller.runtime.subscriptions.tableDataLoadFinished;
        if (typeof existingUnsubscribe === "function") {
          existingUnsubscribe();
        }
        controller.runtime.subscriptions.tableDataLoadFinished = subscribeTableDataChanges(controller._KDB, api);
        return true;
      } catch (error) {
        console.error("[dienststelle.mount] failed", error);
        return false;
      }
    }

    function destroy() {
      var runtime;
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        runtime = controller.runtime || controller._KDB.runtime.dienststelle;
        if (runtime) {
          _kitRuntime.disposeRuntimeBuckets(runtime).forEach(function (error) {
            console.warn("[dienststelle.destroy] runtime release failed", error);
          });
          runtime.tabMutationRunId = 0;
          runtime.tabMutationSnapshots = {};
          runtime.historyReplayHandlerContribution = null;
        }
        dispatchInternal({ type: ACTIONS.DESTROY, payload: {} });
      } catch (error) {
        console.error("[dienststelle.destroy] failed", error);
      }
    }

    function dispatchDisposed(_action) {
      if (_parameterSet.isParameterSetAction(_action.type)) {
        return _parameterSet.disposedResult();
      }
      if (_tabMutation.isTabMutationAction(_action.type)) {
        return _tabMutation.disposedResult(_action.payload);
      }
      return undefined;
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

    function dispatch(_action) {
      var action = _action || {};
      if (guard.blocked("dispatch")) {
        return dispatchDisposed(action);
      }
      try {
        if (_parameterSet.isParameterSetAction(action.type)) {
          return _parameterSet.routeParameterSetAction(
            _parameterSet.createParameterSetContext(controller, dispatch, dispatchInternal),
            action
          );
        }
        if (_tabMutation.isTabMutationAction(action.type)) {
          // No filtersFacet on purpose: the tab-mutation effects resolve it through the module's host
          // choke point (contracts/cognosHostService.md section 7).
          return _tabMutation.routeTabMutationAction({
            _KDB: controller._KDB,
            runtime: controller.runtime || ensureDienststelleRuntime(controller._KDB),
            dispatchInternal: dispatchInternal
          }, action);
        }
        return dispatchRouted(action);
      } catch (error) {
        console.error("[dienststelle.dispatch] failed", error);
        reportError(error);
        return undefined;
      }
    }

    function getState() {
      return guard.isDisposed() ? undefined : _kitData.cloneJson(_selectors.readDienststelleState(controller._KDB));
    }

    function getCurrentHierarchySnapshot(_options) {
      return guard.isDisposed() ? undefined : _hierarchySnapshot.readCurrentHierarchySnapshot(controller._KDB, _options);
    }

    api = {
      mount: mount,
      destroy: destroy,
      dispatch: dispatch,
      getState: getState,
      getCurrentHierarchySnapshot: getCurrentHierarchySnapshot
    };
    return api;
  }

  function registerDienststelle(_KDB, _options) {
    var runtime;
    var controllerApi;
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.api = _KDB.api || {};
    if (!_KDB.state.filters.dienststelle) {
      _KDB.state.filters.dienststelle = _state.createInitialState();
    }
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

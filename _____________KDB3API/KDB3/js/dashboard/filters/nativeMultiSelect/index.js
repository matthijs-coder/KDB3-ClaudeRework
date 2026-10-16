define([
  "./config.js",
  "./state.js",
  "./commit.js",
  "./history.js",
  "./restore.js",
  "./tabMutation/snapshot.js",
  "./tabMutation/apply.js",
  "./tabMutation/hostScopes.js",
  "../_core/ownerController.js",
  "../_core/tabMutation.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js"
], function (_config, _state, _commit, _history, _restore, _snapshot, _apply, _hostScopes, _ownerController, _tabMutation, _runtime, _errors) {
  "use strict";

  // Lifecycle terms for NativeMultiSelect: idle, ready, error, disposed.

  var actions = _config.actions;
  var codes = _config.parameterSetCodes;

  var HANDLERS = {};
  HANDLERS[actions.COLLECT_WRITEBACK_SNAPSHOT_REQUESTED] = _restore.collectWritebackSnapshot;
  HANDLERS[actions.PARAMETER_SET_CLEAR_REQUESTED] = _restore.parameterSetClear;
  HANDLERS[actions.PARAMETER_SET_RESTORE_REQUESTED] = _restore.parameterSetRestore;
  HANDLERS[actions.PREPARE_TAB_MUTATION] = _snapshot.prepareTabMutation;
  HANDLERS[actions.APPLY_TAB_MUTATION] = _apply.applyTabMutation;
  HANDLERS[actions.RESTORE_TAB_MUTATION_SNAPSHOT] = _snapshot.restoreTabMutationSnapshot;
  HANDLERS[actions.RESYNC_TAB_MUTATION_HOST] = _hostScopes.resyncTabMutationHost;
  HANDLERS[actions.FILTER_DOCK_STATE_CHANGED] = _commit.commitFilterDockConfirm;
  HANDLERS[actions.HISTORY_REPLAY_REQUESTED] = _history.applyHistoryReplay;

  function disposedParameterSetResult() {
    return Promise.resolve({
      ok: false,
      diagnostics: [{ code: codes.CANCELLED, message: "NativeMultiSelect controller is disposed" }]
    });
  }

  var disposedTabMutationResult = _tabMutation.createDisposedResult("NativeMultiSelect controller is disposed");

  // Results for the families whose callers wait for an answer. Every other action type warns once and returns undefined.
  var DISPOSED_RESULTS = {};
  DISPOSED_RESULTS[actions.PARAMETER_SET_CLEAR_REQUESTED] = disposedParameterSetResult;
  DISPOSED_RESULTS[actions.PARAMETER_SET_RESTORE_REQUESTED] = disposedParameterSetResult;
  DISPOSED_RESULTS[actions.COLLECT_WRITEBACK_SNAPSHOT_REQUESTED] = function () {
    return { ok: true, entries: [], diagnostics: [] };
  };
  DISPOSED_RESULTS[actions.PREPARE_TAB_MUTATION] = disposedTabMutationResult;
  DISPOSED_RESULTS[actions.APPLY_TAB_MUTATION] = disposedTabMutationResult;
  DISPOSED_RESULTS[actions.RESTORE_TAB_MUTATION_SNAPSHOT] = disposedTabMutationResult;
  DISPOSED_RESULTS[actions.RESYNC_TAB_MUTATION_HOST] = disposedTabMutationResult;
  DISPOSED_RESULTS[actions.HISTORY_REPLAY_REQUESTED] = function () { return false; };

  function lookup(_table, _type) {
    return Object.prototype.hasOwnProperty.call(_table, _type) ? _table[_type] : null;
  }

  function errorMessage(_err) {
    return String(_err && _err.message ? _err.message : _err);
  }

  function createNativeMultiSelectController(_KDB, _filtersFacet) {
    var guard = _errors.createDisposedGuard("nativeMultiSelect");
    var runtime = _KDB.runtime.nativeMultiSelect;
    var dispatchInternal = _ownerController.createStateWriter(_KDB, "nativeMultiSelect", _state.createReducer());
    var ctx = { _KDB: _KDB, filtersFacet: _filtersFacet, runtime: runtime, dispatchInternal: dispatchInternal };

    function reportError(_code, _err) {
      dispatchInternal({ type: actions.ERROR, payload: { errorCode: _code, errorMessage: errorMessage(_err) } });
    }

    function readState() {
      var filtersState = _KDB.state && _KDB.state.filters;
      return filtersState ? filtersState.nativeMultiSelect : undefined;
    }

    function teardown() {
      var errors = _runtime.disposeRuntimeBuckets(runtime);
      if (errors.length > 0) {
        console.error("[nativeMultiSelect.destroy] runtime cleanup failed", errors);
      }
      runtime.tabMutationRunId = 0;
      runtime.parameterSetRunId = 0;
      runtime.tabMutationSnapshots = {};
    }

    function route(_action) {
      var handler = lookup(HANDLERS, _action.type);
      if (handler) {
        return handler(ctx, _action.payload || {});
      }
      dispatchInternal(_action);
      return readState();
    }

    return _ownerController.createOwnerController({
      _KDB: _KDB,
      name: "nativeMultiSelect",
      guard: guard,
      reduce: dispatchInternal,
      mount: function () { dispatchInternal({ type: actions.MOUNT_READY, payload: {} }); },
      teardown: teardown,
      route: route,
      readState: readState,
      destroyAction: actions.DESTROY,
      clearsReplayContribution: true,
      disposedResults: DISPOSED_RESULTS,
      warnOnDisposedResult: false,
      logFailure: function (_phase, _error) { console.error("[nativeMultiSelect." + _phase + "]", _error); },
      onMountError: function (_error) { reportError("NATIVE_MULTI_SELECT_MOUNT_FAILED", _error); },
      onDispatchError: function (_error) { reportError("NATIVE_MULTI_SELECT_DISPATCH_FAILED", _error); },
      onDestroyError: function (_error) { reportError("NATIVE_MULTI_SELECT_DESTROY_FAILED", _error); }
    });
  }

  function readHostFacet(_KDB, _name) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service[_name] ? service[_name] : null;
  }

  function registerNativeMultiSelect(_KDB) {
    _ownerController.prepareOwnerNamespaces(_KDB, "nativeMultiSelect", { createInitialState: _state.initialState });
    var runtime = _runtime.ensureRuntime(_KDB, "nativeMultiSelect", {
      tabMutationRunId: 0,
      parameterSetRunId: 0,
      tabMutationSnapshots: {}
    });
    // The tabs facet is read by tabMutation/guard.js; deep files do not look up cognosHost themselves.
    runtime.tabsFacet = readHostFacet(_KDB, "tabs");
    runtime.historyReplayHandlerContribution = _history.createHistoryReplayHandler();
    _KDB.api.nativeMultiSelect = createNativeMultiSelectController(_KDB, readHostFacet(_KDB, "filters"));
    return _KDB.api.nativeMultiSelect;
  }

  return registerNativeMultiSelect;
});

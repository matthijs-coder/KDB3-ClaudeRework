define([
  "./config.js",
  "./state.js",
  "./commit.js",
  "./history.js",
  "./restore.js",
  "./tabMutation/snapshot.js",
  "./tabMutation/apply.js",
  "./tabMutation/hostScopes.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js"
], function (_config, _state, _commit, _history, _restore, _snapshot, _apply, _hostScopes, _runtime, _errors) {
  "use strict";

  // Lifecycle terms for NativeMultiSelect: idle, ready, error, disposed.

  var actions = _config.actions;
  var codes = _config.parameterSetCodes;
  var tabCodes = _config.tabMutationCodes;

  var HANDLERS = {};
  HANDLERS[actions.COLLECT_WRITEBACK_SNAPSHOT_REQUESTED] = _restore.collectWritebackSnapshot;
  HANDLERS[actions.PARAMETER_SET_CLEAR_REQUESTED] = _restore.parameterSetClear;
  HANDLERS[actions.PARAMETER_SET_RESTORE_REQUESTED] = _restore.parameterSetRestore;
  HANDLERS[actions.PREPARE_TAB_MUTATION] = _snapshot.prepareTabMutation;
  HANDLERS[actions.APPLY_TAB_MUTATION] = _apply.applyTabMutation;
  HANDLERS[actions.RESTORE_TAB_MUTATION_SNAPSHOT] = _snapshot.restoreTabMutationSnapshot;
  HANDLERS[actions.RESYNC_TAB_MUTATION_HOST] = _hostScopes.resyncTabMutationHost;
  HANDLERS[actions.FILTER_DOCK_STATE_CHANGED] = _commit.handleFilterDockConfirm;
  HANDLERS[actions.HISTORY_REPLAY_REQUESTED] = _history.handleHistoryReplay;

  function disposedParameterSetResult() {
    return Promise.resolve({
      ok: false,
      diagnostics: [{ code: codes.CANCELLED, message: "NativeMultiSelect controller is disposed" }]
    });
  }

  function disposedTabMutationResult(_payload) {
    var payload = _payload || {};
    return Promise.resolve({
      ok: false,
      operationId: payload.operationId || null,
      diagnostics: [{ code: tabCodes.CANCELLED, message: "NativeMultiSelect controller is disposed" }]
    });
  }

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
    var reducer = _state.createReducer();
    var runtime = _KDB.runtime.nativeMultiSelect;
    var ctx = { _KDB: _KDB, filtersFacet: _filtersFacet, runtime: runtime, dispatchInternal: dispatchInternal };

    function dispatchInternal(_action) {
      var filtersState = _KDB.state && _KDB.state.filters;
      if (filtersState) {
        filtersState.nativeMultiSelect = reducer(filtersState.nativeMultiSelect, _action);
      }
    }

    function reportError(_code, _err) {
      dispatchInternal({ type: actions.ERROR, payload: { errorCode: _code, errorMessage: errorMessage(_err) } });
    }

    function getState() {
      var filtersState = _KDB.state && _KDB.state.filters;
      if (guard.isDisposed()) { return undefined; }
      return filtersState ? filtersState.nativeMultiSelect : undefined;
    }

    function mount() {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        dispatchInternal({ type: actions.MOUNT_READY, payload: {} });
        return true;
      } catch (err) {
        console.error("[nativeMultiSelect.mount]", err);
        reportError("NATIVE_MULTI_SELECT_MOUNT_FAILED", err);
        return false;
      }
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        var errors = _runtime.disposeRuntimeBuckets(runtime);
        if (errors.length > 0) {
          console.error("[nativeMultiSelect.destroy] runtime cleanup failed", errors);
        }
        runtime.tabMutationRunId = 0;
        runtime.parameterSetRunId = 0;
        runtime.tabMutationSnapshots = {};
        runtime.historyReplayHandlerContribution = null;
        dispatchInternal({ type: actions.DESTROY, payload: {} });
      } catch (err) {
        console.error("[nativeMultiSelect.destroy]", err);
        reportError("NATIVE_MULTI_SELECT_DESTROY_FAILED", err);
      }
    }

    function dispatch(_action) {
      var action = _action || {};
      var handler;
      if (guard.isDisposed()) {
        var disposed = lookup(DISPOSED_RESULTS, action.type);
        if (disposed) { return disposed(action.payload); }
        guard.blocked("dispatch");
        return undefined;
      }
      try {
        handler = lookup(HANDLERS, action.type);
        if (handler) {
          return handler(ctx, action.payload || {});
        }
        dispatchInternal(action);
        return getState();
      } catch (err) {
        console.error("[nativeMultiSelect.dispatch]", err);
        reportError("NATIVE_MULTI_SELECT_DISPATCH_FAILED", err);
        return undefined;
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function readHostFacet(_KDB, _name) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service[_name] ? service[_name] : null;
  }

  function registerNativeMultiSelect(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.api = _KDB.api || {};
    if (!_KDB.state.filters.nativeMultiSelect) {
      _KDB.state.filters.nativeMultiSelect = _state.initialState();
    }
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

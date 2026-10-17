define([
  "./config.js",
  "./state.js",
  "./state/selectors.js",
  "./availability.js",
  "./delegation.js",
  "./validation.js",
  "./history.js",
  "./commit.js",
  "./options.js",
  "./restore.js",
  "../_core/ownerController.js",
  "../_core/tableDataWatcher.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/history.js"
], function (
  _config,
  _state,
  _selectors,
  _availability,
  _delegation,
  _validation,
  _history,
  _commit,
  _options,
  _restore,
  _ownerController,
  _tableDataWatcher,
  _rt,
  _errors,
  _kitData,
  _historyKit
) {
  "use strict";

  var REPLAY_KEYS = ["filter_sicht"];

  // Lifecycle terms for sicht: idle, ready, error, disposed.

  var actions = _state.actions;

  function setOf(types) {
    var set = Object.create(null);
    types.forEach(function (type) { set[type] = true; });
    return set;
  }

  var PARAMETER_SET_ACTIONS = setOf([
    actions.PARAMETER_SET_CLEAR_REQUESTED,
    actions.PARAMETER_SET_RESTORE_REQUESTED,
    actions.PARAMETER_SET_DOWNSTREAM_VISIBILITY_REQUESTED
  ]);

  // Ack actions return the handler's structured result to the caller; other routed
  // actions return the current Sicht state.
  var ACK_ACTIONS = setOf([
    actions.PARAMETER_SET_CLEAR_REQUESTED,
    actions.PARAMETER_SET_RESTORE_REQUESTED,
    actions.PARAMETER_SET_DOWNSTREAM_VISIBILITY_REQUESTED,
    actions.SINGLE_SELECT_COMMITTED,
    actions.SINGLE_SELECT_INVENTORY_RECONCILED,
    actions.SYNC_REQUESTED,
    actions.SINGLE_SELECT_DRAFT_CHANGED,
    actions.SINGLE_SELECT_DRAFT_REVERTED
  ]);

  var ROUTES = Object.create(null);
  ROUTES[actions.PARAMETER_SET_CLEAR_REQUESTED] = function (_ctx, _action) {
    return _restore.clearParameterSet(_ctx._KDB, _ctx, _action);
  };
  ROUTES[actions.PARAMETER_SET_RESTORE_REQUESTED] = function (_ctx, _action) {
    return _restore.restoreParameterSet(_ctx._KDB, _ctx, _action);
  };
  ROUTES[actions.PARAMETER_SET_DOWNSTREAM_VISIBILITY_REQUESTED] = function (_ctx, _action) {
    return _restore.applyDownstreamVisibility(_ctx._KDB, _ctx, _action);
  };
  ROUTES[actions.FILTER_DOCK_STATE_CHANGED] = routeFilterDockHandoff;
  ROUTES[actions.FILTER_DOCK_POPUP_READY] = routeFilterDockHandoff;
  ROUTES[actions.SINGLE_SELECT_COMMITTED] = function (_ctx, _action) {
    return _commit.applySingleSelectCommit(_ctx._KDB, _ctx.runtime, _ctx.dispatchInternal, _action.payload);
  };
  ROUTES[actions.SINGLE_SELECT_DRAFT_CHANGED] = routeDraft;
  ROUTES[actions.SINGLE_SELECT_DRAFT_REVERTED] = routeDraft;
  ROUTES[actions.TABLE_DATA_CHANGED] = _options.routeSyncAction;
  ROUTES[actions.SYNC_REQUESTED] = _options.routeSyncAction;
  ROUTES[actions.SINGLE_SELECT_INVENTORY_RECONCILED] = _options.routeSyncAction;
  ROUTES[actions.ERROR] = function (_ctx, _action) {
    _ctx.dispatchInternal(_action);
    return undefined;
  };

  function routeFilterDockHandoff(_ctx, _action) {
    return _delegation.applyFilterDockHandoff(_ctx._KDB, _ctx.dispatchInternal, _action.payload, _action.type);
  }

  function routeDraft(_ctx, _action) {
    return _validation.applySingleSelectDraft(_ctx._KDB, _ctx.dispatchInternal, _action.payload, _action.type);
  }

  // Disposed controllers must still hand writebackSet a structured awaitable
  // cancel ack; a bare undefined would read as "dispatch target not implemented".
  function disposedResult() {
    return Promise.resolve(_restore.ack(false, [
      _restore.diagnostic("WRITEBACK_RESTORE_CANCELLED", "sicht controller is disposed")
    ]));
  }

  function disposedAckResult(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var rawGeneration = payload.inventoryGeneration != null
      ? payload.inventoryGeneration
      : payload.generation;
    var generation = Number(rawGeneration);
    return {
      ok: false,
      acknowledged: false,
      degraded: true,
      disposed: true,
      inventoryGeneration: isFinite(generation) ? generation : null,
      code: "SICHT_DISPOSED",
      message: "sicht controller is disposed",
      diagnostics: [{
        code: "SICHT_DISPOSED",
        message: "sicht controller is disposed"
      }]
    };
  }

  var DISPOSED_RESULTS = {};
  Object.keys(ACK_ACTIONS).forEach(function (_type) { DISPOSED_RESULTS[_type] = disposedAckResult; });
  Object.keys(PARAMETER_SET_ACTIONS).forEach(function (_type) { DISPOSED_RESULTS[_type] = disposedResult; });

  function createSichtController(_KDB) {
    var guard = _errors.createDisposedGuard("sicht");
    var reduce = _ownerController.createStateWriter(_KDB, "sicht", _state.createSichtReducer());
    var ctx = {
      _KDB: _KDB,
      runtime: _rt.ensureRuntime(_KDB, "sicht"),
      dispatchInternal: reduce
    };

    function mount() {
      ctx.runtime = _rt.ensureRuntime(_KDB, "sicht", createRuntimeDefaults());
      reduce({
        type: actions.MOUNT_SUCCEEDED,
        payload: { mountedAt: Date.now() }
      });
      if (_KDB.services && _KDB.services.tableData) {
        ROUTES[actions.SYNC_REQUESTED](ctx, { type: actions.SYNC_REQUESTED, payload: {} });
      }
    }

    function teardown() {
      var errors = _rt.disposeRuntimeBuckets(ctx.runtime);
      if (errors.length) {
        console.warn("[sicht.destroy] runtime cleanup", errors);
      }
      ctx.runtime.delegatedOperationIds = {};
    }

    function route(_action) {
      if (ROUTES[_action.type]) {
        var routed = ROUTES[_action.type](ctx, _action);
        return ACK_ACTIONS[_action.type] === true ? routed : _selectors.readSichtState(_KDB);
      }
      return _selectors.readSichtState(_KDB);
    }

    function reportDispatchError(_error, _action) {
      reduce({
        type: actions.ERROR,
        payload: {
          errorCode: "SICHT_DISPATCH_FAILED",
          errorMessage: String(_error.message || _error)
        }
      });
      return ACK_ACTIONS[_action.type] === true ? {
        ok: false,
        code: "SICHT_DISPATCH_FAILED",
        message: String(_error.message || _error)
      } : undefined;
    }

    // Public surface: callers get a copy, the live state stays owned by the reducer.
    return _ownerController.createOwnerController({
      _KDB: _KDB,
      name: "sicht",
      guard: guard,
      reduce: reduce,
      mount: mount,
      teardown: teardown,
      route: route,
      readState: function () { return _kitData.cloneJson(_selectors.readSichtState(_KDB)); },
      destroyAction: actions.DESTROY,
      clearsReplayContribution: true,
      disposedResults: DISPOSED_RESULTS,
      onDispatchError: reportDispatchError
    });
  }

  function createRuntimeDefaults() {
    return { parameterSetRunId: null, delegatedOperationIds: {} };
  }

  function registerSicht(_KDB) {
    _ownerController.prepareOwnerNamespaces(_KDB, "sicht", {
      createInitialState: _state.createInitialState,
      domSelectors: _config.SELECTORS
    });

    var rt = _rt.ensureRuntime(_KDB, "sicht", createRuntimeDefaults());
    rt.historyReplayHandlerContribution = _history.createSichtReplayHandler();
    _historyKit.registerReplayKeys(_KDB, REPLAY_KEYS, rt.historyReplayHandlerContribution);
    var controller = createSichtController(_KDB);
    _KDB.api.sicht = controller;
    _tableDataWatcher.watchTableData(_KDB, {
      runtime: rt,
      isRelevant: _availability.isRelevantTableName,
      dispatch: controller.dispatch,
      actionType: actions.TABLE_DATA_CHANGED,
      failureLabel: "sicht.tableDataChanged"
    });
    return controller;
  }

  return registerSicht;
});

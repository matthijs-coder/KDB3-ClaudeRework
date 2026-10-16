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
  "../../../core/services/tableData/events/eventNames.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/data.js"
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
  _tableDataEvents,
  _rt,
  _errors,
  _kitData
) {
  "use strict";

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

  function createSichtController(_KDB) {
    var guard = _errors.createDisposedGuard("sicht");
    var reducer = _state.createSichtReducer();
    var ctx = {
      _KDB: _KDB,
      runtime: _rt.ensureRuntime(_KDB, "sicht"),
      dispatchInternal: dispatchInternal
    };

    function dispatchInternal(_action) {
      var filtersState = _KDB.state && _KDB.state.filters;
      if (filtersState) {
        filtersState.sicht = reducer(filtersState.sicht, _action);
      }
    }

    function mount() {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        ctx.runtime = _rt.ensureRuntime(_KDB, "sicht", createRuntimeDefaults());
        dispatchInternal({
          type: actions.MOUNT_SUCCEEDED,
          payload: { mountedAt: Date.now() }
        });
        if (_KDB.services && _KDB.services.tableData) {
          ROUTES[actions.SYNC_REQUESTED](ctx, { type: actions.SYNC_REQUESTED, payload: {} });
        }
        return true;
      } catch (error) {
        console.error("[sicht.mount] failed", error);
        return false;
      }
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        var errors = _rt.disposeRuntimeBuckets(ctx.runtime);
        if (errors.length) {
          console.warn("[sicht.destroy] runtime cleanup", errors);
        }
        ctx.runtime.delegatedOperationIds = {};
        if (_KDB.runtime && _KDB.runtime.sicht) {
          _KDB.runtime.sicht.historyReplayHandlerContribution = null;
        }
        dispatchInternal({ type: actions.DESTROY, payload: {} });
      } catch (error) {
        console.error("[sicht.destroy] failed", error);
      }
    }

    function dispatch(_action) {
      var action = _action || {};
      var isAck = ACK_ACTIONS[action.type] === true;
      if (guard.blocked("dispatch")) {
        if (PARAMETER_SET_ACTIONS[action.type] === true) {
          return disposedResult();
        }
        return isAck ? disposedAckResult(action) : undefined;
      }
      try {
        if (ROUTES[action.type]) {
          var routed = ROUTES[action.type](ctx, action);
          return isAck ? routed : _selectors.readSichtState(_KDB);
        }
        return _selectors.readSichtState(_KDB);
      } catch (error) {
        console.error("[sicht.dispatch] failed", error);
        dispatchInternal({
          type: actions.ERROR,
          payload: {
            errorCode: "SICHT_DISPATCH_FAILED",
            errorMessage: String(error.message || error)
          }
        });
        return isAck ? {
          ok: false,
          code: "SICHT_DISPATCH_FAILED",
          message: String(error.message || error)
        } : undefined;
      }
    }

    // Public surface: callers get a copy, the live state stays owned by the reducer.
    function getState() {
      return guard.isDisposed() ? undefined : _kitData.cloneJson(_selectors.readSichtState(_KDB));
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function subscribeTableDataChanges(_KDB, _controller) {
    var events = _KDB && _KDB.events;
    if (!events || typeof events.subscribe !== "function") {
      return null;
    }
    return events.subscribe(_tableDataEvents.LOAD_FINISHED, function (_payload) {
      try {
        var tableName = _payload && _payload.tableName;
        var rowCount = _payload && _payload.rowCount;
        if (!_availability.isRelevantTableName(_KDB, tableName)) {
          return;
        }
        _controller.dispatch({
          type: actions.TABLE_DATA_CHANGED,
          payload: { tableName: tableName, rowCount: rowCount }
        });
      } catch (error) {
        console.error("[sicht.tableDataChanged] failed", error);
      }
    });
  }

  function createRuntimeDefaults() {
    return { parameterSetRunId: null, delegatedOperationIds: {} };
  }

  function registerSicht(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    _KDB.elements.selectors.sicht = _config.SELECTORS;

    if (!_KDB.state.filters.sicht) {
      _KDB.state.filters.sicht = _state.createInitialState();
    }

    var rt = _rt.ensureRuntime(_KDB, "sicht", createRuntimeDefaults());
    rt.historyReplayHandlerContribution = _history.createSichtReplayHandler();
    var controller = createSichtController(_KDB);
    _KDB.api.sicht = controller;
    if (typeof rt.subscriptions.tableDataLoadFinished === "function") {
      rt.subscriptions.tableDataLoadFinished();
    }
    rt.subscriptions.tableDataLoadFinished = subscribeTableDataChanges(_KDB, controller);
    return controller;
  }

  return registerSicht;
});

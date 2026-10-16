define([
  "./config.js",
  "./state.js",
  "./selectors.js",
  "./tableData.js",
  "./delegation.js",
  "./sync.js",
  "./inventory.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/services/tableData/events/eventNames.js"
], function (
  _config,
  _state,
  _selectors,
  _tableData,
  _delegation,
  _sync,
  _inventory,
  _data,
  _runtime,
  _errors,
  _tableDataEvents
) {
  "use strict";

  // Lifecycle terms for specialSingleSelect: idle, ready, error, disposed.

  var actions = _state.actions;
  var errorCodes = _config.ERROR_CODES;

  var ACK_ACTION_TYPES = [
    actions.USER_SELECTION_COMMITTED,
    actions.SINGLE_SELECT_INVENTORY_RECONCILED,
    actions.SYNC_REQUESTED
  ];

  function isAckAction(_actionType) {
    return ACK_ACTION_TYPES.indexOf(_actionType) !== -1;
  }

  function buildFailureAck(_action, _errorCode, _message, _disposed) {
    var payload = _action && _action.payload ? _action.payload : {};
    return {
      ok: false,
      acknowledged: false,
      degraded: true,
      disposed: _disposed,
      errorCode: _errorCode,
      errorMessage: _message,
      actionType: _action && _action.type,
      inventoryGeneration: payload.inventoryGeneration,
      diagnostics: [{ code: _errorCode, message: _message }]
    };
  }

  function buildDisposedAck(_action) {
    return buildFailureAck(_action, errorCodes.DISPOSED, "specialSingleSelect controller is disposed", true);
  }

  function buildDispatchFailureAck(_action, _error) {
    var message = String(_error && _error.message ? _error.message : _error);
    return buildFailureAck(_action, errorCodes.DISPATCH_FAILED, message, false);
  }

  function routeUserSelectionCommitted(_ctx, _payload) {
    var normalizedPayload = _delegation.normalizeUserSelectionCommittedPayload(_payload);
    var reducedPayload = _delegation.reduceCommittedPayload(normalizedPayload);
    if (!reducedPayload) {
      return _delegation.buildOwnerAck(
        false,
        errorCodes.OWNER_CALLBACK_FAILED,
        "missing canonical user-selection identity payload"
      );
    }
    _sync.dispatchInternal(_ctx, {
      type: actions.USER_SELECTION_COMMITTED,
      payload: normalizedPayload
    });
    return _sync.scheduleSync(_ctx, _payload).then(function (_syncResult) {
      return _delegation.buildTargetScopedAck(_syncResult, reducedPayload);
    });
  }

  function routeFilterDockHandoff(_ctx, _payload, _action) {
    _delegation.handleFilterDockHandoff(_ctx, _payload, _action.type);
    _sync.scheduleSync(_ctx, _payload);
  }

  var ROUTES = {};
  ROUTES[actions.SICHT_CHANGED] = function (_ctx, _payload, _action) {
    _sync.dispatchInternal(_ctx, _action);
    _sync.scheduleSync(_ctx, _payload);
  };
  ROUTES[actions.USER_SELECTION_COMMITTED] = routeUserSelectionCommitted;
  ROUTES[actions.SINGLE_SELECT_INVENTORY_RECONCILED] = _inventory.routeInventoryReconciled;
  ROUTES[actions.TABLE_DATA_CHANGED] = function (_ctx, _payload) {
    _sync.scheduleSync(_ctx, _payload);
  };
  ROUTES[actions.SYNC_REQUESTED] = _inventory.routeSyncRequested;
  ROUTES[actions.FILTER_DOCK_STATE_CHANGED] = routeFilterDockHandoff;
  ROUTES[actions.FILTER_DOCK_POPUP_READY] = routeFilterDockHandoff;
  ROUTES[actions.ERROR] = function (_ctx, _payload, _action) {
    _sync.dispatchInternal(_ctx, _action);
  };

  function routeAction(_ctx, _action) {
    var route = ROUTES[_action.type];
    return route ? route(_ctx, _action.payload || {}, _action) : undefined;
  }

  function createSpecialSingleSelectController(_KDB, _options) {
    var ctx = {
      _KDB: _KDB,
      options: _options || {},
      reducer: _state.createSpecialSingleSelectReducer(),
      runtime: _runtime.ensureRuntime(_KDB, "specialSingleSelect"),
      guard: _errors.createDisposedGuard("specialSingleSelect"),
      syncRequest: null,
      pendingInventoryGeneration: null,
      inventorySyncToken: null,
      lastInventoryGeneration: null,
      lastInventoryResult: null
    };

    function mount(_mountOptions) {
      if (ctx.guard.blocked("mount")) {
        return false;
      }
      try {
        ctx.options = Object.assign({}, ctx.options, _mountOptions || {});
        _sync.dispatchInternal(ctx, {
          type: actions.MOUNT_SUCCEEDED,
          payload: { mountedAt: Date.now() }
        });
        _sync.scheduleSync(ctx);
        return true;
      } catch (error) {
        console.error("[specialSingleSelect.mount] failed", error);
        return false;
      }
    }

    function destroy() {
      if (ctx.guard.isDisposed()) {
        return;
      }
      ctx.guard.dispose();
      try {
        var errors = _runtime.disposeRuntimeBuckets(ctx.runtime);
        ctx.syncRequest = null;
        if (errors.length) {
          console.warn("[specialSingleSelect.destroy] runtime cleanup", errors);
        }
        _sync.dispatchInternal(ctx, { type: actions.DESTROY, payload: {} });
      } catch (error) {
        console.error("[specialSingleSelect.destroy] failed", error);
      }
    }

    function dispatch(_action) {
      if (ctx.guard.blocked("dispatch")) {
        return isAckAction(_action && _action.type) ? buildDisposedAck(_action) : undefined;
      }
      try {
        var actionResult = routeAction(ctx, _action || {});
        if (actionResult && typeof actionResult.then === "function") {
          return actionResult;
        }
        return _selectors.readSpecialSingleSelectState(_KDB);
      } catch (error) {
        console.error("[specialSingleSelect.dispatch] failed", error);
        _sync.dispatchInternal(ctx, {
          type: actions.ERROR,
          payload: {
            errorCode: errorCodes.DISPATCH_FAILED,
            errorMessage: String(error.message || error)
          }
        });
        return isAckAction(_action && _action.type) ? buildDispatchFailureAck(_action, error) : undefined;
      }
    }

    function getState() {
      return ctx.guard.isDisposed() ? undefined : _data.cloneJson(_selectors.readSpecialSingleSelectState(_KDB));
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function subscribeTableDataChanges(_KDB, _api) {
    var events = _KDB && _KDB.events;
    if (!events || typeof events.subscribe !== "function") {
      return null;
    }
    return events.subscribe(_tableDataEvents.LOAD_FINISHED, function (_payload) {
      var tableName = _payload && _payload.tableName;
      if (!_tableData.isRelevantTableName(_KDB, tableName)) {
        return;
      }
      _api.dispatch({
        type: actions.TABLE_DATA_CHANGED,
        payload: { tableName: tableName, rowCount: _payload.rowCount }
      });
    });
  }

  function registerSpecialSingleSelect(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    _KDB.elements.selectors.specialSingleSelect = _config.SELECTORS;

    if (!_KDB.state.filters.specialSingleSelect) {
      _KDB.state.filters.specialSingleSelect = _state.createInitialState();
    }

    var runtime = _runtime.ensureRuntime(_KDB, "specialSingleSelect");
    var controller = createSpecialSingleSelectController(_KDB, _options);
    _KDB.api.specialSingleSelect = controller;
    if (typeof runtime.subscriptions.tableDataLoadFinished === "function") {
      runtime.subscriptions.tableDataLoadFinished();
    }
    runtime.subscriptions.tableDataLoadFinished = subscribeTableDataChanges(_KDB, controller);
    return controller;
  }

  return registerSpecialSingleSelect;
});

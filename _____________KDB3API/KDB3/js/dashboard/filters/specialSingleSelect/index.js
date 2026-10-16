define([
  "./config.js",
  "./state.js",
  "./selectors.js",
  "./tableData.js",
  "./delegation.js",
  "./sync.js",
  "./inventory.js",
  "../_core/ownerController.js",
  "../_core/tableDataWatcher.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js"
], function (
  _config,
  _state,
  _selectors,
  _tableData,
  _delegation,
  _sync,
  _inventory,
  _ownerController,
  _tableDataWatcher,
  _data,
  _runtime,
  _errors
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

  var ROUTES = Object.create(null);
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

  var DISPOSED_RESULTS = {};
  ACK_ACTION_TYPES.forEach(function (_type) { DISPOSED_RESULTS[_type] = buildDisposedAck; });

  function createSpecialSingleSelectController(_KDB, _options) {
    var ctx = {
      _KDB: _KDB,
      options: _options || {},
      reducer: _state.createSpecialSingleSelectReducer(),
      runtime: _runtime.ensureRuntime(_KDB, "specialSingleSelect"),
      guard: _errors.createDisposedGuard("specialSingleSelect"),
      pendingInventoryGeneration: null,
      inventorySyncToken: null,
      lastInventoryGeneration: null,
      lastInventoryResult: null
    };

    function reduce(_action) {
      _sync.dispatchInternal(ctx, _action);
    }

    function mount(_mountOptions) {
      ctx.options = Object.assign({}, ctx.options, _mountOptions || {});
      reduce({
        type: actions.MOUNT_SUCCEEDED,
        payload: { mountedAt: Date.now() }
      });
      _sync.scheduleSync(ctx);
    }

    function teardown() {
      var errors = _runtime.disposeRuntimeBuckets(ctx.runtime);
      ctx.runtime.syncRequest = null;
      if (errors.length) {
        console.error("[specialSingleSelect.destroy] cleanup errors", errors);
      }
    }

    // A non-promise route result (such as an owner ack) is not returned to the caller; the state is.
    function route(_action) {
      var actionResult = routeAction(ctx, _action);
      if (actionResult && typeof actionResult.then === "function") {
        return actionResult;
      }
      return _selectors.readSpecialSingleSelectState(_KDB);
    }

    function reportDispatchError(_error, _action) {
      reduce({
        type: actions.ERROR,
        payload: {
          errorCode: errorCodes.DISPATCH_FAILED,
          errorMessage: String(_error.message || _error)
        }
      });
      return isAckAction(_action.type) ? buildDispatchFailureAck(_action, _error) : undefined;
    }

    return _ownerController.createOwnerController({
      _KDB: _KDB,
      name: "specialSingleSelect",
      guard: ctx.guard,
      reduce: reduce,
      mount: mount,
      teardown: teardown,
      route: route,
      readState: function () { return _data.cloneJson(_selectors.readSpecialSingleSelectState(_KDB)); },
      destroyAction: actions.DESTROY,
      disposedResults: DISPOSED_RESULTS,
      onDispatchError: reportDispatchError
    });
  }

  function registerSpecialSingleSelect(_KDB, _options) {
    _ownerController.prepareOwnerNamespaces(_KDB, "specialSingleSelect", {
      createInitialState: _state.createInitialState,
      domSelectors: _config.SELECTORS
    });

    var runtime = _runtime.ensureRuntime(_KDB, "specialSingleSelect");
    var controller = createSpecialSingleSelectController(_KDB, _options);
    _KDB.api.specialSingleSelect = controller;
    _tableDataWatcher.watchTableData(_KDB, {
      runtime: runtime,
      isRelevant: _tableData.isRelevantTableName,
      dispatch: controller.dispatch,
      actionType: actions.TABLE_DATA_CHANGED
    });
    return controller;
  }

  return registerSpecialSingleSelect;
});

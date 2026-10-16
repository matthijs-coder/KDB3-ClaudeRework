define([
  "./config.js",
  "./historyReplay.js",
  "./runtime.js",
  "./view.js",
  "./commit/ownerSelection.js",
  "./commit/specialPolicy.js",
  "./dockHandoff/handoff.js",
  "./inventory/reconcile.js",
  "./state/reducer.js",
  "./state/selectors.js",
  "./restore/clear.js",
  "./restore/restore.js",
  "./restore/resync.js",
  "./restore/runs.js",
  "./tabMutation/prepare.js",
  "./tabMutation/apply.js",
  "./tabMutation/restore.js",
  "./tabMutation/resync.js",
  "../_core/ownerController.js",
  "../../../core/utils/kit/errors.js"
], function (
  _config,
  _historyReplay,
  _singleSelectRuntime,
  _view,
  _ownerSelection,
  _specialPolicy,
  _handoff,
  _reconcileInventory,
  _reducer,
  _selectors,
  _clear,
  _restore,
  _resync,
  _runs,
  _prepareTabMutation,
  _applyTabMutation,
  _restoreTabMutation,
  _resyncTabMutation,
  _ownerController,
  _kitErrors
) {
  "use strict";

  // Lifecycle terms for singleSelect: idle, ready, error, disposed.

  var actions = _config.actions;

  // Handlers that return the caller's result: (_KDB, _runtime, _payload) -> result
  var ASYNC_HANDLERS = {};
  ASYNC_HANDLERS[actions.PARAMETER_SET_CLEAR_REQUESTED] = _clear.handleParameterSetClear;
  ASYNC_HANDLERS[actions.PARAMETER_SET_RESTORE_REQUESTED] = _restore.handleParameterSetRestore;
  ASYNC_HANDLERS[actions.PARAMETER_SET_RESYNC_REQUESTED] = _resync.handleParameterSetResync;
  ASYNC_HANDLERS[actions.PARAMETER_SET_RUN_FINISHED] = _runs.handleParameterSetRunFinished;
  ASYNC_HANDLERS[actions.RECONCILE_FILTER_INSTANCES] = _reconcileInventory.reconcileFilterInstances;
  ASYNC_HANDLERS[actions.APPLY_OWNER_SELECTION] = _ownerSelection.applyOwnerSelection;
  ASYNC_HANDLERS[actions.APPLY_SPECIAL_SELECTION_POLICY] = _specialPolicy.applySpecialSelectionPolicy;
  ASYNC_HANDLERS[actions.PREPARE_TAB_MUTATION] = _prepareTabMutation.prepareTabMutation;
  ASYNC_HANDLERS[actions.APPLY_TAB_MUTATION] = _applyTabMutation.applyTabMutation;
  ASYNC_HANDLERS[actions.RESTORE_TAB_MUTATION_SNAPSHOT] = _restoreTabMutation.restoreTabMutationSnapshot;
  ASYNC_HANDLERS[actions.RESYNC_TAB_MUTATION_HOST] = _resyncTabMutation.resyncTabMutationHost;

  // Handlers that change state; dispatch then returns the state snapshot.
  var STATE_HANDLERS = {};
  STATE_HANDLERS[actions.FILTER_DOCK_STATE_CHANGED] = function (_ctx, _action) {
    _handoff.processFilterDockHandoff(_ctx.KDB, _ctx.runtime, _action.payload, _action.type, _ctx.options);
  };
  STATE_HANDLERS[actions.FILTER_DOCK_POPUP_READY] = STATE_HANDLERS[actions.FILTER_DOCK_STATE_CHANGED];
  STATE_HANDLERS[actions.FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED] = function (_ctx) {
    _view.handleCommittedDisplay(_ctx.KDB);
  };
  STATE_HANDLERS[actions.ERROR] = function (_ctx, _action) {
    _ctx.reduce(_action);
  };

  // After destroy these types still answer with a cancelled result; resync is not part of the list.
  var DISPOSED_ASYNC_TYPES = {};
  [
    actions.PARAMETER_SET_CLEAR_REQUESTED,
    actions.PARAMETER_SET_RESTORE_REQUESTED,
    actions.PARAMETER_SET_RESYNC_REQUESTED,
    actions.PARAMETER_SET_RUN_FINISHED,
    actions.RECONCILE_FILTER_INSTANCES,
    actions.APPLY_OWNER_SELECTION,
    actions.APPLY_SPECIAL_SELECTION_POLICY,
    actions.PREPARE_TAB_MUTATION,
    actions.APPLY_TAB_MUTATION,
    actions.RESTORE_TAB_MUTATION_SNAPSHOT
  ].forEach(function (_type) { DISPOSED_ASYNC_TYPES[_type] = true; });

  function hasOwn(_table, _key) {
    return Object.prototype.hasOwnProperty.call(_table, _key);
  }

  function disposedResult(_action) {
    var cancelled = { code: _config.parameterSetCodes.CANCELLED, message: "singleSelect controller is disposed" };
    if (_action.type === actions.PARAMETER_SET_RUN_FINISHED) {
      var runId = _action.payload && typeof _action.payload.runId === "number" && isFinite(_action.payload.runId)
        ? _action.payload.runId : null;
      return Promise.resolve({ ok: false, runId: runId, released: false, alreadyReleased: false, diagnostics: [cancelled] });
    }
    return Promise.resolve({ ok: false, degraded: false, applied: [], skipped: [], diagnostics: [cancelled] });
  }

  function readHostFiltersFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  }

  var DISPOSED_RESULTS = {};
  Object.keys(DISPOSED_ASYNC_TYPES).forEach(function (_type) { DISPOSED_RESULTS[_type] = disposedResult; });

  function createController(_KDB, _options) {
    var guard = _kitErrors.createDisposedGuard("singleSelect");
    var controller = { options: _options || {} };
    var reduce = _ownerController.createStateWriter(_KDB, "singleSelect", _reducer.createSingleSelectReducer());

    function dispatchAction(_action) {
      var action = _action || {};
      var runtime = _singleSelectRuntime.ensureSingleSelectRuntime(_KDB);
      if (hasOwn(ASYNC_HANDLERS, action.type)) {
        return ASYNC_HANDLERS[action.type](_KDB, runtime, action.payload);
      }
      if (hasOwn(STATE_HANDLERS, action.type)) {
        STATE_HANDLERS[action.type]({ KDB: _KDB, runtime: runtime, options: controller.options, reduce: reduce }, action);
      }
      return _selectors.readSingleSelectState(_KDB);
    }

    function mount(_mountOptions) {
      _singleSelectRuntime.ensureSingleSelectRuntime(_KDB);
      controller.options = Object.assign({}, controller.options, _mountOptions || {});
      var root = _KDB.state.filters.singleSelect;
      root.instancesById = root.instancesById || {};
      root.inventory = root.inventory || { generation: 0, freshness: "stale", reconciledAt: null, errorCode: null };
      delete root.byScope;
      reduce({ type: actions.MOUNT_SUCCEEDED, payload: { mountedAt: Date.now() } });
      dispatchAction({ type: actions.RECONCILE_FILTER_INSTANCES, payload: { reason: "mount" } });
    }

    function teardown() {
      _singleSelectRuntime.resetSingleSelectRuntime(_singleSelectRuntime.ensureSingleSelectRuntime(_KDB));
    }

    function reportError(_code, _error) {
      reduce({
        type: actions.ERROR,
        payload: { errorCode: _code, errorMessage: String(_error.message || _error) }
      });
    }

    function logFailure(_phase, _error, _action) {
      if (_phase === "dispatch") {
        console.error("[singleSelect.dispatch] failed", { actionType: _action && _action.type }, _error);
        return;
      }
      console.error("[singleSelect." + _phase + "] failed", _error);
    }

    return _ownerController.createOwnerController({
      _KDB: _KDB,
      name: "singleSelect",
      guard: guard,
      reduce: reduce,
      mount: mount,
      teardown: teardown,
      route: dispatchAction,
      readState: function () { return _selectors.readSingleSelectState(_KDB); },
      destroyAction: actions.DESTROY,
      clearsReplayContribution: true,
      disposedResults: DISPOSED_RESULTS,
      logFailure: logFailure,
      onMountError: function (_error) { reportError("SINGLE_SELECT_MOUNT_FAILED", _error); },
      onDispatchError: function (_error) { reportError("SINGLE_SELECT_DISPATCH_FAILED", _error); }
    });
  }

  function register(_KDB, _options) {
    _ownerController.prepareOwnerNamespaces(_KDB, "singleSelect", {
      createInitialState: _reducer.initialState,
      domSelectors: _config.domSelectors
    });
    var runtime = _singleSelectRuntime.ensureSingleSelectRuntime(_KDB);
    // cognosHost is the first core service, so it exists by the time the filter
    // orchestrators run; the guard covers a harness that boots without services.
    runtime.filtersFacet = readHostFiltersFacet(_KDB);
    runtime.historyReplayHandlerContribution = _historyReplay.createHistoryReplayHandler();
    var controller = createController(_KDB, _options);
    _KDB.api.singleSelect = controller;
    return controller;
  }

  return register;
});

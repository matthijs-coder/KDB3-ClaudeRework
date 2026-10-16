define([
  "./config/actionTypes.js",
  "./config.js",
  "./state.js",
  "./reducer.js",
  "./selectors.js",
  "./effects.js",
  "./view.js",
  "./observe.js",
  "./chrome.js",
  "./history.js",
  "./slots.js",
  "./editUi/session.js",
  "./editUi/renameActions.js",
  "./restore/parameterSetRestore.js",
  "./tabMutation/actions.js",
  "./tabMutation/slotStock/ledger.js",
  "./readCurrentTab.js",
  "./traverse/traverse.js",
  "../../core/utils/kit/runtime.js",
  "../../core/utils/kit/errors.js"
], function (
  _actionTypes, _config, _state, _reducer, _selectors, _effects, _view, _observe, _chrome, _history, _slots,
  _session, _renameActions, _parameterSet, _tabMutation, _slotStockLedger, _readCurrentTab, _traverse, _rt, _errors
) {
  "use strict";

  // Tabs module entry. Lifecycle terms: idle, initializing, loading, ready, error, disposed.

  function registerTabs(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    _KDB.elements.selectors.tabs = Object.assign({}, _KDB.elements.selectors.tabs || {}, _config.selectors);
    _KDB.state.tabs = _KDB.state.tabs || _state.createInitialTabsState();
    const adapter = initializeRuntime(_KDB);
    _KDB.runtime.tabs.historyReplayHandlerContribution = _history.createTabsHistoryReplayHandler(_KDB);
    const controller = createTabsController({ _KDB: _KDB, adapter: adapter, options: _options || {} });
    _KDB.api.tabs = controller;
    return controller;
  }

  function initializeRuntime(_KDB) {
    const runtime = _rt.ensureRuntime(_KDB, "tabs");
    runtime.lastTabMutationError = null;
    runtime.historyReplayHandlerContribution = null;
    runtime.adapters = runtime.adapters || {};
    const service = _KDB.services && _KDB.services.cognosHost ? _KDB.services.cognosHost : null;
    runtime.tabsFacet = service && service.tabs ? service.tabs : null;
    runtime.canvasFacet = service && service.canvas ? service.canvas : null;
    _readCurrentTab.bindUtilsCompat(_KDB, runtime, _readCurrentTab.createReader(runtime));
    runtime.adapters.cognos = _effects.createCognosTabsAdapter({ tabsFacet: runtime.tabsFacet });
    runtime.editSession = null;
    return runtime.adapters.cognos;
  }

  function createTabsController(_deps) {
    const _KDB = _deps._KDB;
    const guard = _errors.createDisposedGuard("tabs");
    const instance = { _KDB: _KDB, adapter: _deps.adapter, guard: guard, startupPromise: null };
    instance.getState = function getState() {
      return guard.isDisposed() ? undefined : _selectors.readTabsState(_KDB);
    };
    instance.dispatch = dispatchTabsAction.bind(null, instance);
    instance.ctx = {
      _KDB: _KDB,
      adapter: instance.adapter,
      dispatch: instance.dispatch,
      getRawState: function () { return _KDB.state.tabs; },
      getState: instance.getState,
      isDisposed: guard.isDisposed
    };
    const readCurrentTab = _readCurrentTab.createReader(_KDB.runtime.tabs);
    return {
      mount: mountTabs.bind(null, instance),
      destroy: destroyTabs.bind(null, instance),
      dispatch: instance.dispatch,
      getState: instance.getState,
      // Same answer as kit readTabsBusy(_KDB, ["tabMutation"]); false once destroyed (the buckets are reset).
      isMutationRunning: function isMutationRunning() { return _rt.readTabsBusy(_KDB, ["tabMutation"]); },
      readCurrentTab: function (_root) { return guard.isDisposed() ? _readCurrentTab.NO_TAB : readCurrentTab(_root); }
    };
  }

  function destroyTabs(instance) {
    if (instance.guard.isDisposed()) { return; }
    instance.guard.dispose();
    const _KDB = instance._KDB;
    try {
      instance.startupPromise = null;
      _slotStockLedger.reset(_KDB);
      _session.cleanupEditSession(_KDB);
      const runtime = _KDB.runtime.tabs;
      const errors = _rt.disposeRuntimeBuckets(runtime);
      if (errors.length > 0) { console.warn("[tabs.destroy] some runtime entries failed to release", errors); }
      runtime.adapters = {};
      runtime.lastTabMutationError = null;
      runtime.historyReplayHandlerContribution = null;
      _readCurrentTab.restoreUtilsCompat(_KDB, runtime);
      _reducer.commitTabsState(_KDB, { type: _actionTypes.DESTROY, payload: { source: "destroy" } });
    } catch (err) {
      console.error("[tabs.destroy] destroy boundary failed", err);
      _reducer.commitTabsState(_KDB, buildErrorAction(err));
    }
  }

  function buildErrorAction(err) {
    return {
      type: _actionTypes.ERROR,
      payload: { errorCode: "TABS_ERROR", errorMessage: err && err.message ? err.message : String(err || "Unknown tabs error.") }
    };
  }

  function dispatchTabsAction(instance, _action) {
    const action = _action || {};
    const type = action.type;
    if (instance.guard.isDisposed() && type !== _actionTypes.DESTROY) {
      instance.guard.blocked("dispatch");
      return disposedResult(action);
    }
    try {
      return routeAction(instance, action);
    } catch (err) {
      console.error("[tabs.dispatch] dispatch boundary failed", err);
      _reducer.commitTabsState(instance._KDB, buildErrorAction(err));
      return false;
    }
  }

  function disposedResult(action) {
    if (_parameterSet.isParameterSetAction(action.type)) { return _parameterSet.disposedResult(action.type, action.payload); }
    if (_tabMutation.isTabMutationAction(action.type)) { return _tabMutation.disposedResult(); }
    return action.type === _actionTypes.TRAVERSE ? Promise.resolve(false) : false;
  }

  function routeAction(instance, action) {
    const type = action.type;
    const payload = action.payload;
    const _KDB = instance._KDB;
    if (_parameterSet.isParameterSetAction(type)) { return _parameterSet.routeParameterSetAction(instance.ctx, action); }
    if (_tabMutation.isTabMutationAction(type)) { return _tabMutation.routeTabMutationAction(instance.ctx, action); }
    if (type === _actionTypes.TRAVERSE) {
      return isEffectResult(payload, ["pending", "confirmed", "failed"])
        ? _reducer.commitTabsState(_KDB, action)
        : _traverse.dispatchTabsTraverse(instance, payload || {});
    }
    if (type === _actionTypes.REORDER) { return false; }
    if (type === _actionTypes.RENAME) { return dispatchRename(instance, action); }
    if (type === _actionTypes.ADD && !hasHiddenUserTab(_KDB.state.tabs)) {
      _reducer.commitTabsState(_KDB, action);
      return false;
    }
    if (type === _actionTypes.SELECT_TOOL && !(payload && payload.tool === "rename")) { return false; }
    const didCommit = _reducer.commitTabsState(_KDB, action);
    if (didCommit && runsEffects(type)) { _effects.applyTabsEffects(instance.ctx, action); }
    return didCommit;
  }

  function isEffectResult(payload, phases) {
    return !!payload && phases.indexOf(payload.phase) >= 0;
  }

  function runsEffects(type) {
    return type === _actionTypes.ADD
      || type === _actionTypes.AUTHORING_ENTERED
      || type === _actionTypes.AUTHORING_EXITED
      || type === _actionTypes.SELECT_EDIT_TARGET
      || type === _actionTypes.CANCEL_EDIT_SESSION;
  }

  // A rename request commits the pending phase, then runs the Cognos rename; the phase results come back
  // through this same dispatch and only commit.
  function dispatchRename(instance, action) {
    if (isEffectResult(action.payload, ["confirmed", "failed"])) { return _reducer.commitTabsState(instance._KDB, action); }
    const pending = _renameActions.buildPendingRename(instance._KDB, action);
    if (!pending) { return false; }
    _reducer.commitTabsState(instance._KDB, { type: _actionTypes.RENAME, payload: pending });
    return _effects.applyTabsEffects(instance.ctx, { type: _actionTypes.RENAME, payload: pending });
  }

  function hasHiddenUserTab(state) {
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const order = Array.isArray(state && state.order) ? state.order : [];
    return order.some(function (index) {
      const tab = byIndex[String(index)];
      return _slots.isDashboardTab(tab) && tab.visible !== true;
    });
  }

  function mountTabs(instance, _options) {
    const _KDB = instance._KDB;
    if (instance.guard.blocked("mount")) { return false; }
    if (_KDB.state.tabs && _KDB.state.tabs.lifecycle === "ready") { return true; }
    try {
      subscribeAuthoring(instance);
      if (!isStartupInProgress(_KDB)) {
        _reducer.commitTabsState(_KDB, { type: _actionTypes.INITIALIZE, payload: { source: "mount" } });
      }
      runInitialSync(instance, _options || {});
      startBackgroundStartup(instance);
      return true;
    } catch (err) {
      console.error("[tabs.mount] mount boundary failed", err);
      _reducer.commitTabsState(_KDB, buildErrorAction(err));
      return false;
    }
  }

  function runInitialSync(instance, options) {
    const ctx = instance.ctx;
    _effects.applyTabsEffects(ctx, { type: _actionTypes.SYNC_FROM_DOM, payload: { source: "mount", options: options } });
    if (instance.guard.isDisposed()) { return; }
    _view.syncDomFromState(instance._KDB, instance._KDB.state.tabs);
    _observe.startActiveTabObserver(ctx);
  }

  function startBackgroundStartup(instance) {
    const pendingPromises = instance._KDB.runtime && instance._KDB.runtime.tabs && instance._KDB.runtime.tabs.pendingPromises;
    if (!pendingPromises) { return null; }
    if (pendingPromises.startup) {
      instance.startupPromise = pendingPromises.startup;
      return pendingPromises.startup;
    }
    const promise = runBackgroundStartup(instance).then(function (result) {
      if (pendingPromises.startup === promise) { delete pendingPromises.startup; }
      if (instance.startupPromise === promise) { instance.startupPromise = null; }
      return result;
    });
    pendingPromises.startup = promise;
    instance.startupPromise = promise;
    return promise;
  }

  async function runBackgroundStartup(instance) {
    const ctx = instance.ctx;
    const isDisposed = instance.guard.isDisposed;
    try {
      await _effects.applyTabsEffects(ctx, { type: _actionTypes.HYDRATE_DOM, payload: { source: "mount" } });
      if (isDisposed()) { return false; }
      await _effects.applyTabsEffects(ctx, { type: _actionTypes.SYNC_FROM_DOM, payload: { source: "hydrate" } });
      if (isDisposed()) { return false; }
      _observe.startActiveTabObserver(ctx);
      await _traverse.dispatchTabsTraverse(instance, { source: "mount" });
      if (isDisposed()) { return false; }
      _view.syncDomFromState(instance._KDB, instance._KDB.state.tabs);
      return true;
    } catch (err) {
      console.error("[tabs.runBackgroundStartup] startup sequence failed", err);
      _reducer.commitTabsState(instance._KDB, buildErrorAction(err));
      return false;
    }
  }

  function subscribeAuthoring(instance) {
    const events = instance._KDB.events;
    const runtime = instance._KDB.runtime.tabs;
    if (!events || typeof events.subscribe !== "function" || runtime.subscriptions.authoringEntered) { return; }
    runtime.subscriptions.authoringEntered = events.subscribe("authoring:entered", function () {
      instance.dispatch({ type: _actionTypes.AUTHORING_ENTERED, payload: { source: "authoring" } });
    });
    runtime.subscriptions.authoringExited = events.subscribe("authoring:exited", function () {
      instance.dispatch({ type: _actionTypes.AUTHORING_EXITED, payload: { source: "authoring" } });
    });
  }

  function isStartupInProgress(_KDB) {
    const pendingPromises = _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises;
    return !!(pendingPromises && pendingPromises.startup);
  }

  return registerTabs;
});

define(["../config/actionTypes.js", "./applyTabsEffects.js", "./syncTabsDomFromState.js", "./observeActiveTab.js", "../traverse/dispatchTraverse.js", "../actions/commitTabsState.js"], function (_actionTypes, _applyTabsEffects, _syncTabsDomFromState, _observeActiveTab, _dispatchTabsTraverse, _commitTabsState) {
  "use strict";

  function mountTabsController(instance, _options) {
    try {
      if (instance.isDisposed) { warnDisposed(instance, "mount"); return false; }
      if (instance._KDB.state.tabs && instance._KDB.state.tabs.lifecycle === "ready") { return true; }
      subscribeAuthoring(instance);
      if (!isStartupInProgress(instance)) {
        _commitTabsState(instance, { type: _actionTypes.INITIALIZE, payload: { source: "mount" } });
      }
      runInitialSync(instance, _options || {});
      startBackgroundStartup(instance);
      return true;
    } catch (err) {
      console.error("[tabs.mount] mount boundary failed", err);
      _commitTabsState(instance, buildErrorAction(err));
      return false;
    }
  }

  function runInitialSync(instance, options) {
    const ctx = buildEffectContext(instance);
    _applyTabsEffects(ctx, { type: _actionTypes.SYNC_FROM_DOM, payload: { source: "mount", options: options } });
    if (!isDisposed(instance)) {
      _syncTabsDomFromState(instance._KDB, instance._KDB.state.tabs);
      _observeActiveTab(ctx);
    }
  }

  function startBackgroundStartup(instance) {
    const runtime = instance._KDB.runtime && instance._KDB.runtime.tabs;
    const pendingPromises = runtime && runtime.pendingPromises;
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
    try {
      const ctx = buildEffectContext(instance);
      await _applyTabsEffects(ctx, { type: _actionTypes.HYDRATE_DOM, payload: { source: "mount" } });
      if (isDisposed(instance)) { return false; }
      await _applyTabsEffects(ctx, { type: _actionTypes.SYNC_FROM_DOM, payload: { source: "hydrate" } });
      if (isDisposed(instance)) { return false; }
      _observeActiveTab(ctx);
      await _dispatchTabsTraverse(instance, { source: "mount" });
      if (isDisposed(instance)) { return false; }
      _syncTabsDomFromState(instance._KDB, instance._KDB.state.tabs);
      return true;
    } catch (err) {
      console.error("[tabs.runBackgroundStartup] startup sequence failed", err);
      _commitTabsState(instance, buildErrorAction(err));
      return false;
    }
  }

  function subscribeAuthoring(instance) {
    const events = instance._KDB.events; const runtime = instance._KDB.runtime.tabs;
    if (!events || typeof events.subscribe !== "function" || runtime.subscriptions.authoringEntered) { return; }
    runtime.subscriptions.authoringEntered = events.subscribe("authoring:entered", dispatchAuthoringEntered.bind(null, instance));
    runtime.subscriptions.authoringExited = events.subscribe("authoring:exited", dispatchAuthoringExited.bind(null, instance));
  }

  function dispatchAuthoringEntered(instance) { try { instance.dispatch({ type: _actionTypes.AUTHORING_ENTERED, payload: { source: "authoring" } }); } catch (err) { console.error("[tabs.dispatchAuthoringEntered] subscriber failed", err); } }
  function dispatchAuthoringExited(instance) { try { instance.dispatch({ type: _actionTypes.AUTHORING_EXITED, payload: { source: "authoring" } }); } catch (err) { console.error("[tabs.dispatchAuthoringExited] subscriber failed", err); } }
  function isStartupInProgress(instance) { const pendingPromises = instance._KDB.runtime && instance._KDB.runtime.tabs && instance._KDB.runtime.tabs.pendingPromises; return !!(pendingPromises && pendingPromises.startup); }
  function buildEffectContext(instance) { return { _KDB: instance._KDB, adapter: instance.adapter, dispatch: instance.dispatch, getRawState: getRawState.bind(null, instance), getState: instance.getState, isDisposed: isDisposed.bind(null, instance) }; }
  function getRawState(instance) { return instance._KDB.state.tabs; }
  function isDisposed(instance) { return instance.isDisposed === true; }
  function warnDisposed(instance, methodName) { if (methodName === "mount" && !instance.didWarnDisposedMount) { console.warn("[tabs.mount] called after destroy; obtain a fresh instance from the factory"); instance.didWarnDisposedMount = true; } if (methodName === "dispatch" && !instance.didWarnDisposedDispatch) { console.warn("[tabs.dispatch] called after destroy"); instance.didWarnDisposedDispatch = true; } }
  function buildErrorAction(err) { return { type: _actionTypes.ERROR, payload: { errorCode: "TABS_ERROR", errorMessage: err && err.message ? err.message : String(err || "Unknown tabs error.") } }; }

  return mountTabsController;
});

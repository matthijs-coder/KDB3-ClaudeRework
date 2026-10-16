define(["../config/actionTypes.js", "../config/defaults.js", "../effects/applyTabsEffects.js", "./commitTabsState.js"], function (_actionTypes, _defaults, _applyTabsEffects, _commitTabsState) {
  "use strict";

  function dispatchTabsTraverse(instance, rawPayload) {
    const payload = normalizeTraversePayload(rawPayload);
    if (payload.includeHelperTabs) {
      recordTraverseFailure(instance, "TABS_HELPER_TRAVERSE_UNSUPPORTED", "Helper tab traversal is not supported.");
      return Promise.resolve(false);
    }
    if (payload.scope === "singleTab" && typeof payload.tabIndex !== "number") {
      recordTraverseFailure(instance, "TABS_TRAVERSE_INVALID_PAYLOAD", "scope singleTab requires tabIndex.");
      return Promise.resolve(false);
    }
    const runtime = instance._KDB.runtime && instance._KDB.runtime.tabs;
    const pendingPromises = runtime && runtime.pendingPromises;
    if (!pendingPromises) {
      return runTraverseEffect(instance, payload);
    }
    const traverseKey = buildTraverseKey(payload);
    if (pendingPromises.traverse && pendingPromises.traverseKey === traverseKey) {
      return pendingPromises.traverse;
    }
    if (pendingPromises.traverse) {
      recordTraverseFailure(instance, "TABS_TRAVERSE_CONFLICT", "A different tabs traversal is already in flight.");
      return Promise.resolve(false);
    }
    const promise = runTraverseEffect(instance, payload).then(function (result) {
      if (pendingPromises.traverse === promise) {
        delete pendingPromises.traverse;
        delete pendingPromises.traverseKey;
      }
      return result;
    }, function (err) {
      if (pendingPromises.traverse === promise) {
        delete pendingPromises.traverse;
        delete pendingPromises.traverseKey;
      }
      console.error("[tabs.dispatchTraverse] traverse promise rejected", err);
      return false;
    });
    pendingPromises.traverse = promise;
    pendingPromises.traverseKey = traverseKey;
    return promise;
  }

  function runTraverseEffect(instance, payload) {
    const ctx = buildEffectContext(instance);
    return _applyTabsEffects(ctx, { type: _actionTypes.TRAVERSE, payload: payload });
  }

  function normalizeTraversePayload(rawPayload) {
    const payload = rawPayload || {};
    return {
      source: payload.source || "api",
      scope: payload.scope || "visibleDashboard",
      tabIndex: typeof payload.tabIndex === "number" && payload.tabIndex === Math.floor(payload.tabIndex) ? payload.tabIndex : null,
      includeHiddenDashboardTabs: payload.includeHiddenDashboardTabs === true,
      includeHelperTabs: payload.includeHelperTabs === true,
      restoreActiveTab: payload.restoreActiveTab !== false,
      restoreTabIndex: typeof payload.restoreTabIndex === "number" ? payload.restoreTabIndex : null,
      waitFor: payload.waitFor || "canvas",
      timeoutMs: typeof payload.timeoutMs === "number" && payload.timeoutMs > 0 ? payload.timeoutMs : _defaults.HYDRATE_TIMEOUT_MS
    };
  }

  function buildTraverseKey(payload) {
    return [payload.scope, payload.tabIndex, payload.includeHiddenDashboardTabs, payload.includeHelperTabs, payload.restoreActiveTab, payload.restoreTabIndex, payload.waitFor].join("|");
  }

  function recordTraverseFailure(instance, errorCode, errorMessage) {
    _commitTabsState(instance, {
      type: _actionTypes.TRAVERSE,
      payload: {
        phase: "failed",
        traversedIndexes: [],
        canvasLoadedByIndex: {},
        activeIndex: null,
        activeTabId: null,
        currentTabId: null,
        lastTraversedAt: Date.now(),
        errorCode: errorCode,
        errorMessage: errorMessage
      }
    });
  }

  function buildEffectContext(instance) { return { _KDB: instance._KDB, adapter: instance.adapter, dispatch: instance.dispatch, getRawState: getRawState.bind(null, instance), getState: instance.getState, isDisposed: isDisposed.bind(null, instance) }; }
  function getRawState(instance) { return instance._KDB.state.tabs; }
  function isDisposed(instance) { return instance.isDisposed === true; }

  dispatchTabsTraverse.normalizeTraversePayload = normalizeTraversePayload;
  return dispatchTabsTraverse;
});

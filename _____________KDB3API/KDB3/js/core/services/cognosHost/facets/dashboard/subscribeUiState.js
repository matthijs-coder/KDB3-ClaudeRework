define([
  "../../hostAccess.js",
  "../../runtime.js",
  "./read.js"
], function (_hostAccess, _runtime, _read) {
  "use strict";

  // subscribeUiState(callback): the callback receives flat { authoring, mode } snapshots, first
  // the current state (get-then-subscribe), then one per host change. Live uiState objects and
  // host Promises stay in ring 1. Returns an idempotent unsubscribe (a noop when nothing was armed).

  function noopUnsubscribe() {}

  function emitSnapshot(_ctx, _subscription, _uiState) {
    var snapshot;
    if (_subscription.released || !_subscription.callback || _hostAccess.isFacetStale(_ctx)) {
      return;
    }
    snapshot = _read.buildUiStateSnapshot(_uiState, _hostAccess.resolveHostApi(_ctx._KDB, "dashboard"));
    try {
      _subscription.callback(snapshot);
    } catch (callbackError) {
      console.error("[cognosHost.dashboard.subscribeUiState] callback failed", callbackError);
    }
  }

  function emitCurrentSnapshot(_ctx, _subscription, _dashboardApi) {
    var currentUiState;
    if (typeof _dashboardApi.getCurrentDashboardUiState !== "function") {
      return;
    }
    try {
      currentUiState = _dashboardApi.getCurrentDashboardUiState();
      if (!_hostAccess.isThenable(currentUiState)) {
        emitSnapshot(_ctx, _subscription, currentUiState);
      }
    } catch (bootError) {
      console.error("[cognosHost.dashboard.subscribeUiState] boot snapshot failed", bootError);
    }
  }

  function releaseSubscription(_ctx, _subscription) {
    if (_subscription.released) {
      return;
    }
    _subscription.released = true;
    _subscription.callback = null;
    // Not while disposing: destroy iterates runtime.subscriptions and calls every unsubscribe,
    // splicing the array underneath that loop would skip entries.
    if (!_ctx.isDisposed()) {
      _runtime.pruneSubscription(_ctx._KDB, _subscription.unsubscribe);
    }
    try {
      _hostAccess.detachHostSubscription(_subscription.handle);
    } catch (detachError) {
      console.error("[cognosHost.dashboard.subscribeUiState] unsubscribe failed", detachError);
    }
  }

  function subscribeUiState(_ctx, _callback) {
    var subscription = { callback: _callback, released: false, handle: undefined, unsubscribe: null };
    var dashboardApi;
    var unsubscribe;
    if (typeof _callback !== "function" || _hostAccess.isFacetStale(_ctx)) {
      return noopUnsubscribe;
    }
    try {
      dashboardApi = _hostAccess.resolveHostApi(_ctx._KDB, "dashboard");
      if (!dashboardApi || typeof dashboardApi.onDashboardUiStateChange !== "function") {
        return noopUnsubscribe;
      }
      emitCurrentSnapshot(_ctx, subscription, dashboardApi);
      if (_hostAccess.isFacetStale(_ctx)) {
        return noopUnsubscribe;
      }
      subscription.handle = dashboardApi.onDashboardUiStateChange(function onHostUiState(uiState) {
        emitSnapshot(_ctx, subscription, uiState);
      });
      unsubscribe = releaseSubscription.bind(null, _ctx, subscription);
      subscription.unsubscribe = unsubscribe;
      _runtime.addSubscription(_ctx._KDB, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error("[cognosHost.dashboard.subscribeUiState] failed", error);
      try {
        _hostAccess.detachHostSubscription(subscription.handle);
      } catch (_detachError) {
        // Host detach after a failed subscribe must not throw across the facet.
      }
      return noopUnsubscribe;
    }
  }

  return subscribeUiState;
});

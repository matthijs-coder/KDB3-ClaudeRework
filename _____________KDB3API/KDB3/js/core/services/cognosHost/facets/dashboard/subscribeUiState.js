define([
  "./resolveDashboardHostApi.js",
  "./read/buildUiStateSnapshot.js",
  "./isDashboardFacetStale.js",
  "../../runtime/ensureCognosHostRuntime.js"
], function (
  _resolveDashboardHostApi,
  _buildUiStateSnapshot,
  _isDashboardFacetStale,
  _ensureCognosHostRuntime
) {
  "use strict";

  function noopUnsubscribe() {}

  function detachHostSubscription(_handle) {
    if (!_handle) {
      return;
    }
    if (typeof _handle.then === "function") {
      _handle.then(detachHostSubscription, function ignoreHostPromise() {});
      return;
    }
    if (typeof _handle.remove === "function") {
      _handle.remove();
      return;
    }
    if (typeof _handle.off === "function") {
      _handle.off();
      return;
    }
    if (typeof _handle.unsubscribe === "function") {
      _handle.unsubscribe();
      return;
    }
    if (typeof _handle.dispose === "function") {
      _handle.dispose();
      return;
    }
    if (typeof _handle === "function") {
      _handle();
    }
  }

  function storeUnsubscribe(_ctx, _unsubscribe) {
    var runtime = _ensureCognosHostRuntime(_ctx._KDB);
    if (!runtime || !Array.isArray(runtime.subscriptions)) {
      return false;
    }
    runtime.subscriptions.push(_unsubscribe);
    return true;
  }

  function subscribeUiState(_ctx, _callback) {
    var dashboardApi;
    var handle;
    var box;
    var released;
    var unsubscribe;
    var currentUiState;
    var emitMappedSnapshot;
    if (typeof _callback !== "function" || _isDashboardFacetStale(_ctx)) {
      return noopUnsubscribe;
    }
    try {
      dashboardApi = _resolveDashboardHostApi(_ctx._KDB);
      if (!dashboardApi || typeof dashboardApi.onDashboardUiStateChange !== "function") {
        return noopUnsubscribe;
      }
      box = { callback: _callback };
      released = false;
      // Flat DTO only. Live uiState and host Promises stay in ring 1.
      emitMappedSnapshot = function emitMappedSnapshot(_uiState) {
        var liveDashboardApi;
        var snapshot;
        if (released || !box.callback || _isDashboardFacetStale(_ctx)) {
          return;
        }
        liveDashboardApi = _resolveDashboardHostApi(_ctx._KDB);
        snapshot = _buildUiStateSnapshot(_uiState, liveDashboardApi);
        try {
          box.callback(snapshot);
        } catch (callbackError) {
          console.error("[cognosHost.dashboard.subscribeUiState] callback failed", callbackError);
        }
      };
      // Get-then-subscribe (authoring boot): emit the current snapshot before
      // attaching onDashboardUiStateChange and before returning unsubscribe.
      if (typeof dashboardApi.getCurrentDashboardUiState === "function") {
        try {
          currentUiState = dashboardApi.getCurrentDashboardUiState();
          if (!(currentUiState && typeof currentUiState.then === "function")) {
            emitMappedSnapshot(currentUiState);
          }
        } catch (bootError) {
          console.error("[cognosHost.dashboard.subscribeUiState] boot snapshot failed", bootError);
        }
        if (released || _isDashboardFacetStale(_ctx)) {
          return noopUnsubscribe;
        }
      }
      handle = dashboardApi.onDashboardUiStateChange(function onHostUiState(uiState) {
        emitMappedSnapshot(uiState);
      });
      unsubscribe = function unsubscribeUiState() {
        if (released) {
          return;
        }
        released = true;
        box.callback = null;
        try {
          detachHostSubscription(handle);
        } catch (detachError) {
          console.error("[cognosHost.dashboard.subscribeUiState] unsubscribe failed", detachError);
        }
      };
      if (!storeUnsubscribe(_ctx, unsubscribe)) {
        unsubscribe();
        return noopUnsubscribe;
      }
      return unsubscribe;
    } catch (error) {
      console.error("[cognosHost.dashboard.subscribeUiState] failed", error);
      try {
        detachHostSubscription(handle);
      } catch (_detachError) {
        // Host detach after a failed subscribe must not throw across the facet.
      }
      return noopUnsubscribe;
    }
  }

  return subscribeUiState;
});

define(["../events/authoringMode"], function (_authoringMode) {
  "use strict";
  var ENTER = "authoring/enter";
  var EXIT = "authoring/exit";
  var SOURCES = { "cognos-ui": 1, api: 1, bootstrap: 1 };

  function detachHostSubscription(handle) {
    if (!handle) return;
    // Named detach methods first; a bare function handle last
    // (common unsubscribe convention, but semantics are host-dependent).
    if (typeof handle.remove === "function") { handle.remove(); return; }
    if (typeof handle.off === "function") { handle.off(); return; }
    if (typeof handle.unsubscribe === "function") { handle.unsubscribe(); return; }
    if (typeof handle.dispose === "function") { handle.dispose(); return; }
    if (typeof handle === "function") handle();
  }

  function unsubscribeAuthoringSubscriptions(_KDB) {
    var runtimeAuthoring = _KDB.runtime && _KDB.runtime.authoring;
    var subscriptions = runtimeAuthoring && runtimeAuthoring.subscriptions;
    if (!subscriptions) return;
    Object.keys(subscriptions).forEach(function (key) {
      try {
        if (typeof subscriptions[key] === "function") subscriptions[key]();
      } catch (err) {
        console.error("[authoring] unsubscribe failed", key, err);
      }
    });
    runtimeAuthoring.subscriptions = {};
  }

  function mountAuthoring(_KDB) {
    if (!_KDB.state.authoring) _KDB.state.authoring = { isAuthoring: false };
    // Re-render on the same instance: detach the old host callback before resetting runtime,
    // otherwise the uiState callback accumulates per render.
    unsubscribeAuthoringSubscriptions(_KDB);
    _KDB.runtime.authoring = {};
  }

  function destroyAuthoring(_KDB) {
    unsubscribeAuthoringSubscriptions(_KDB);
    _KDB.state.authoring = { isAuthoring: false };
    _KDB.runtime.authoring = null;
  }

  function dispatchAuthoring(_KDB, action) {
    var type = action && action.type;
    var payload = action && action.payload;
    if (type !== ENTER && type !== EXIT) {
      console.error("[authoring.dispatch] unknown type", type);
      return;
    }
    if (!payload || !SOURCES[payload.source]) {
      console.error("[authoring.dispatch] invalid or missing payload.source", payload);
      return;
    }
    var isAuthoring = type === ENTER;
    var current = _KDB.state.authoring;
    if (!!(current && current.isAuthoring === true) === isAuthoring) return;
    _KDB.state.authoring = { isAuthoring: isAuthoring };
    _KDB.events.emit(isAuthoring ? _authoringMode.AUTHORING_ENTERED : _authoringMode.AUTHORING_EXITED, {
      isAuthoring: isAuthoring,
      source: payload.source,
    });
  }

  function createAuthoringController(_KDB) {
    return {
      mount: function () {
        try {
          mountAuthoring(_KDB);
        } catch (err) {
          console.error("[authoring.mount]", err);
        }
      },
      destroy: function () {
        try {
          destroyAuthoring(_KDB);
        } catch (err) {
          console.error("[authoring.destroy]", err);
        }
      },
      dispatch: function (action) {
        try {
          dispatchAuthoring(_KDB, action);
        } catch (err) {
          console.error("[authoring.dispatch]", err);
        }
      },
      getState: function () {
        var s = _KDB.state.authoring;
        return { isAuthoring: !!(s && s.isAuthoring) };
      },
    };
  }

  /** Subscribes once to the dashboard uiState facet stamped on runtime.authoring and mirrors it into dispatch(). */
  createAuthoringController.syncFromDashboardMode = function syncFromDashboardMode(_KDB) {
    var runtimeAuthoring = _KDB.runtime && _KDB.runtime.authoring;
    var dashboardFacet = runtimeAuthoring && runtimeAuthoring.dashboardFacet;
    if (!dashboardFacet || typeof dashboardFacet.subscribeUiState !== "function") return;
    if (runtimeAuthoring.isDashboardUiStateSubscribed === true) return;
    runtimeAuthoring.isDashboardUiStateSubscribed = true;
    // Box instead of a direct closure over _KDB: even if the facet returns
    // no unsubscribe handle, unsubscribe nulls the callback target and
    // stops pinning the graph.
    var box = { kdb: _KDB };
    var handle = dashboardFacet.subscribeUiState(function (uiState) {
      var kdb = box.kdb;
      if (!kdb || kdb._isDisposed) return;
      kdb.api.authoring.dispatch({
        type: uiState && uiState.authoring === true ? ENTER : EXIT,
        payload: { source: "cognos-ui" },
      });
    });
    runtimeAuthoring.subscriptions = runtimeAuthoring.subscriptions || {};
    runtimeAuthoring.subscriptions.uiState = function unsubscribeUiState() {
      box.kdb = null;
      detachHostSubscription(handle);
    };
  };

  return createAuthoringController;
});

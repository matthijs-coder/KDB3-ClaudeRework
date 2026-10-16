define([], function () {
  "use strict";
  function syncAuthoringFromUiState(_KDB, uiState) {
    var type = uiState && uiState.authoring === true ? "authoring/enter" : "authoring/exit";
    _KDB.api.authoring.dispatch({ type: type, payload: { source: "cognos-ui" } });
  }
  function detachHostSubscription(handle) {
    if (!handle) { return; }
    // Named detach methods first; a bare function handle last
    // (common unsubscribe convention, but semantics are host-dependent).
    if (typeof handle.remove === "function") { handle.remove(); return; }
    if (typeof handle.off === "function") { handle.off(); return; }
    if (typeof handle.unsubscribe === "function") { handle.unsubscribe(); return; }
    if (typeof handle.dispose === "function") { handle.dispose(); return; }
    if (typeof handle === "function") { handle(); }
  }
  function syncAuthoringFromDashboardMode(_KDB) {
    var runtimeAuthoring = _KDB.runtime && _KDB.runtime.authoring;
    var dashboardFacet = runtimeAuthoring && runtimeAuthoring.dashboardFacet;
    if (!dashboardFacet || typeof dashboardFacet.subscribeUiState !== "function") {
      return;
    }
    if (runtimeAuthoring.isDashboardUiStateSubscribed === true) return;
    runtimeAuthoring.isDashboardUiStateSubscribed = true;
    // Box instead of a direct closure over _KDB: even if the facet returns
    // no unsubscribe handle, unsubscribe nulls the callback target and
    // stops pinning the graph.
    var box = { kdb: _KDB };
    var handle = dashboardFacet.subscribeUiState(function (uiState) {
      var kdb = box.kdb;
      if (!kdb || kdb._isDisposed) return;
      syncAuthoringFromUiState(kdb, uiState);
    });
    runtimeAuthoring.subscriptions = runtimeAuthoring.subscriptions || {};
    runtimeAuthoring.subscriptions.uiState = function unsubscribeUiState() {
      box.kdb = null;
      detachHostSubscription(handle);
    };
  }
  return syncAuthoringFromDashboardMode;
});

define([
  "./read.js",
  "./navigation.js",
  "./subscribeUiState.js"
], function (_read, _navigation, _subscribeUiState) {
  "use strict";

  // The dashboard facet of the cognosHost service.
  //
  // Deliberately absent: resolveCaptureRoot / capture. captureTabPage.js stays on
  // _KDB.cognosAPI.dashboard.resolveCaptureRoot (PDF exception register).
  function createDashboardAdapter(_ctx) {
    return Object.assign(_read.createValueGetters(_ctx), {
      subscribeUiState: _subscribeUiState.bind(null, _ctx),
      replaceWithBiHomePerspective: _navigation.replaceWithBiHomePerspective.bind(null, _ctx),
      openAppView: _navigation.openAppView.bind(null, _ctx)
    });
  }

  return createDashboardAdapter;
});

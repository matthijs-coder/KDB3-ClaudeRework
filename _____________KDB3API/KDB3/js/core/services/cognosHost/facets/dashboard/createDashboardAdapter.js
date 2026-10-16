define([
  "./read/readDashboardHostValue.js",
  "./subscribeUiState.js",
  "./nav/replaceWithBiHomePerspective.js",
  "./nav/openAppView.js"
], function (
  _readDashboardHostValue,
  _subscribeUiState,
  _replaceWithBiHomePerspective,
  _openAppView
) {
  "use strict";

  // The dashboard facet of the cognosHost service. Named with the Adapter
  // suffix that naming.mdc prescribes for host adapters; "facet" is the
  // architectural term for a domain-scoped part of the ring-1 adapter.
  //
  // Deliberately absent: resolveCaptureRoot / capture. captureTabPage.js stays
  // on _KDB.cognosAPI.dashboard.resolveCaptureRoot (PDF exception register).
  function createDashboardAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return {
      getFileName: _readDashboardHostValue.bind(null, ctx, "getFileName"),
      getDashboardVersion: _readDashboardHostValue.bind(null, ctx, "getDashboardVersion"),
      getEnvironmentSource: _readDashboardHostValue.bind(null, ctx, "getEnvironmentSource"),
      getBoardId: _readDashboardHostValue.bind(null, ctx, "getBoardId"),
      getDashboardBiBaseUrl: _readDashboardHostValue.bind(null, ctx, "getDashboardBiBaseUrl"),
      getLanguage: _readDashboardHostValue.bind(null, ctx, "getLanguage"),
      getUserName: _readDashboardHostValue.bind(null, ctx, "getUserName"),
      getMode: _readDashboardHostValue.bind(null, ctx, "getMode"),
      subscribeUiState: _subscribeUiState.bind(null, ctx),
      replaceWithBiHomePerspective: _replaceWithBiHomePerspective.bind(null, ctx),
      openAppView: _openAppView.bind(null, ctx)
    };
  }

  return createDashboardAdapter;
});

define([
  "../resolveDashboardHostApi.js",
  "../buildDashboardOutcome.js",
  "../config/dashboardErrorCodes.js",
  "../isDashboardFacetStale.js"
], function (
  _resolveDashboardHostApi,
  _buildDashboardOutcome,
  _dashboardErrorCodes,
  _isDashboardFacetStale
) {
  "use strict";

  async function __controller(_ctx, _viewName) {
    var dashboardApi;
    if (_isDashboardFacetStale(_ctx)) {
      return _buildDashboardOutcome.buildDisposed();
    }
    if (_viewName !== "home") {
      return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.INVALID_VIEW, []);
    }
    try {
      dashboardApi = _resolveDashboardHostApi(_ctx._KDB);
      if (!dashboardApi) {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof dashboardApi.openAppView !== "function") {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      await Promise.resolve(dashboardApi.openAppView(_viewName));
      if (_isDashboardFacetStale(_ctx)) {
        return _buildDashboardOutcome.buildAborted("aborted-after-effect");
      }
      return _buildDashboardOutcome.buildOk({ ready: true });
    } catch (error) {
      console.error("[cognosHost.dashboard.openAppView] failed", { viewName: _viewName }, error);
      return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.NAV_FAILED, [
        _buildDashboardOutcome.buildDiagnostic(_dashboardErrorCodes.NAV_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

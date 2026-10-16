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

  function ensureTrailingSlash(_value) {
    if (!_value) return _value;
    return _value.charAt(_value.length - 1) === "/" ? _value : _value + "/";
  }

  function isUsableBaseUrl(_value) {
    return typeof _value === "string" && _value !== "";
  }

  // Ring-1 only: window.top.location.replace must not run from features.
  function __controller(_ctx) {
    var dashboardApi;
    var base;
    if (_isDashboardFacetStale(_ctx)) {
      return _buildDashboardOutcome.buildDisposed();
    }
    try {
      dashboardApi = _resolveDashboardHostApi(_ctx._KDB);
      if (!dashboardApi) {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof dashboardApi.getDashboardBiBaseUrl !== "function") {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      base = dashboardApi.getDashboardBiBaseUrl();
      if (!isUsableBaseUrl(base)) {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.NAV_FAILED, [
          _buildDashboardOutcome.buildDiagnostic(_dashboardErrorCodes.NAV_FAILED, "invalid dashboard bi base url")
        ]);
      }
      if (typeof window === "undefined" || !window.top || !window.top.location || typeof window.top.location.replace !== "function") {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.NAV_FAILED, [
          _buildDashboardOutcome.buildDiagnostic(_dashboardErrorCodes.NAV_FAILED, "window.top.location.replace is missing")
        ]);
      }
      if (_isDashboardFacetStale(_ctx)) {
        return _buildDashboardOutcome.buildDisposed();
      }
      window.top.location.replace(ensureTrailingSlash(base) + "?perspective=home");
      return _buildDashboardOutcome.buildOk({ ready: true });
    } catch (error) {
      console.error("[cognosHost.dashboard.replaceWithBiHomePerspective] failed", error);
      return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.NAV_FAILED, [
        _buildDashboardOutcome.buildDiagnostic(_dashboardErrorCodes.NAV_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});

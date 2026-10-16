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

  function isThenable(_value) {
    return !!(
      _value &&
      (typeof _value === "object" || typeof _value === "function") &&
      typeof _value.then === "function"
    );
  }

  function normalizeHostValue(_value) {
    if (_value == null) {
      return _buildDashboardOutcome.buildOk(null);
    }
    if (isThenable(_value)) {
      return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.READ_FAILED, [
        _buildDashboardOutcome.buildDiagnostic(
          _dashboardErrorCodes.READ_FAILED,
          "host returned a Promise"
        )
      ]);
    }
    if (typeof _value === "object" || typeof _value === "function") {
      return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.READ_FAILED, [
        _buildDashboardOutcome.buildDiagnostic(
          _dashboardErrorCodes.READ_FAILED,
          "host returned a live object"
        )
      ]);
    }
    return _buildDashboardOutcome.buildOk(_value);
  }

  function readDashboardHostValue(_ctx, _methodName) {
    var dashboardApi;
    var hostValue;
    if (_isDashboardFacetStale(_ctx)) {
      return _buildDashboardOutcome.buildDisposed();
    }
    try {
      dashboardApi = _resolveDashboardHostApi(_ctx._KDB);
      if (!dashboardApi) {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof dashboardApi[_methodName] !== "function") {
        return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      hostValue = dashboardApi[_methodName]();
      return normalizeHostValue(hostValue);
    } catch (error) {
      console.error("[cognosHost.dashboard." + _methodName + "] failed", error);
      return _buildDashboardOutcome.buildFailed(_dashboardErrorCodes.READ_FAILED, [
        _buildDashboardOutcome.buildDiagnostic(
          _dashboardErrorCodes.READ_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return readDashboardHostValue;
});

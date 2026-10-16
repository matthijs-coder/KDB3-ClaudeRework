define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js"
], function (_outcome, _errorCodes, _hostAccess) {
  "use strict";

  // Host navigation of the dashboard facet. window.top.location.replace lives here and not in
  // features: only ring 1 may leave the dashboard frame.
  var CODES = _errorCodes.dashboard;

  function failNav(_message) {
    return _outcome.buildFailed(CODES.NAV_FAILED, [_outcome.buildDiagnostic(CODES.NAV_FAILED, _message)]);
  }

  function ensureTrailingSlash(_value) {
    return _value.charAt(_value.length - 1) === "/" ? _value : _value + "/";
  }

  function canReplaceTopLocation() {
    return typeof window !== "undefined" && !!window.top && !!window.top.location &&
      typeof window.top.location.replace === "function";
  }

  async function openAppView(_ctx, _viewName) {
    var resolved;
    if (_hostAccess.isFacetStale(_ctx)) {
      return _outcome.buildDisposed();
    }
    if (_viewName !== "home") {
      return _outcome.buildFailed(CODES.INVALID_VIEW, []);
    }
    try {
      resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "dashboard", "openAppView", CODES);
      if (resolved.failure) {
        return resolved.failure;
      }
      await Promise.resolve(resolved.api.openAppView(_viewName));
      if (_hostAccess.isFacetStale(_ctx)) {
        return _outcome.buildAborted("aborted-after-effect");
      }
      return _outcome.buildOk({ ready: true });
    } catch (error) {
      console.error("[cognosHost.dashboard.openAppView] failed", { viewName: _viewName }, error);
      return failNav(error && error.message);
    }
  }

  function replaceWithBiHomePerspective(_ctx) {
    var resolved;
    var base;
    if (_hostAccess.isFacetStale(_ctx)) {
      return _outcome.buildDisposed();
    }
    try {
      resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "dashboard", "getDashboardBiBaseUrl", CODES);
      if (resolved.failure) {
        return resolved.failure;
      }
      base = resolved.api.getDashboardBiBaseUrl();
      if (typeof base !== "string" || base === "") {
        return failNav("invalid dashboard bi base url");
      }
      if (!canReplaceTopLocation()) {
        return failNav("window.top.location.replace is missing");
      }
      if (_hostAccess.isFacetStale(_ctx)) {
        return _outcome.buildDisposed();
      }
      window.top.location.replace(ensureTrailingSlash(base) + "?perspective=home");
      return _outcome.buildOk({ ready: true });
    } catch (error) {
      console.error("[cognosHost.dashboard.replaceWithBiHomePerspective] failed", error);
      return failNav(error && error.message);
    }
  }

  return {
    openAppView: openAppView,
    replaceWithBiHomePerspective: replaceWithBiHomePerspective
  };
});

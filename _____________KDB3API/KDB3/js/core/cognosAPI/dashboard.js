define([
  "./dashboard/resolveCaptureRoot.js",
  "./dashboard/getBoardId.js",
  "./dashboard/getDashboardBiBaseUrl.js",
  "./dashboard/getUserName.js"
], function (_resolveCaptureRoot, _getBoardId, _getDashboardBiBaseUrl, _getUserName) {
  "use strict";

  function readGlassHostVersion() {
    var root;
    var ctrl;
    var info;
    try {
      root = typeof window !== "undefined" ? window : null;
      ctrl = root && (root.__glassAppController || (root.top && root.top.__glassAppController));
      info = ctrl && ctrl.versionInfo;
      if (typeof info === "string" && info) return info;
      if (info && typeof info === "object") return info.version || info.productVersion || info.displayVersion || null;
      return null;
    } catch (_error) {
      console.warn("[cognosAPI.dashboard.getDashboardVersion][hostVersionReadFailed]", _error);
      return null;
    }
  }

  function __controller(_KDB) {
    try {
      return {
        getDashboardState: function () {
          return __getDashboardAPI().getFeature("DashboardState");
        },

        // Cognos DashboardState.onUiStateChange contract (legacy-aligned).
        onDashboardUiStateChange: function (_callback) {
          return __getDashboardAPI().getFeature("DashboardState").onUiStateChange(_callback);
        },

        getCurrentDashboardUiState: function () {
          const state = __getDashboardAPI().getFeature("DashboardState");
          if (!state) {
            return null;
          }
          if (typeof state.getUiState === "function") {
            return state.getUiState();
          }
          if (typeof state.getState === "function") {
            return state.getState();
          }
          return null;
        },

        getUserInfo: function () {
          return __getDashboardAPI().getFeature("UserProfile").getUserAccount();
        },

        getMode: function () {
          return __getDashboardAPI().getMode();
        },

        setMode: function (_mode) {
          return __getDashboardAPI().setMode(_mode);
        },

        getLanguage: function () {
          return __getDashboardAPI().getFeature("UserProfile").getProductLocale();
        },

        getUserName: _getUserName,

        getFileName: function () {
          return __getDashboardAPI().getSpec().name;
        },

        getDashboardVersion: function () {
          var hostVersion = readGlassHostVersion();
          var spec = __getDashboardAPI().getSpec();
          var hostDashIndex;
          if (hostVersion) {
            hostDashIndex = hostVersion.indexOf("-");
            return hostDashIndex >= 0 ? hostVersion.slice(0, hostDashIndex) : hostVersion;
          }
          return spec && (spec.version || spec.schemaVersion || spec.apiVersion || null);
        },

        getEnvironmentSource: function () {
          return typeof document !== "undefined" && document.location
            ? document.location.href
            : null;
        },

        getBoardId: _getBoardId,

        getDashboardBiBaseUrl: _getDashboardBiBaseUrl,

        resolveCaptureRoot: function (_tabLike) {
          return _resolveCaptureRoot(_tabLike);
        },

        // Expects a boolean accepted by DashboardState.setFullScreen.
        setFullScreen: function (_state) {
          return __getDashboardAPI().getFeature("DashboardState").setFullScreen(_state);
        },

        // _zoomValue is a Canvas defaultZoom value (e.g. "fitPage"); defaults to "fitPage" when omitted.
        setDashboardZoom: function (_zoomValue) {
          const zoomValue = _zoomValue === undefined ? "fitPage" : _zoomValue;
          return __getDashboardAPI()
            .getCanvasWhenReady()
            .then(function (canvasApi) {
              return canvasApi.setPropertyValue("defaultZoom", zoomValue);
            });
        },

        openAppView: function (_viewName) {
          return __getDashboardAPI().openAppView(_viewName);
        },
      };
    } catch (error) {
      console.error("[KDB][__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});

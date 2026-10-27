define(["./captureRoot.js"], function (_resolveCaptureRoot) {
  "use strict";

  function isThenable(_value) {
    return !!(
      _value &&
      (typeof _value === "object" || typeof _value === "function") &&
      typeof _value.then === "function"
    );
  }

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

  function getDashboardVersion() {
    var hostVersion = readGlassHostVersion();
    var spec = __getDashboardAPI().getSpec();
    var hostDashIndex;
    if (hostVersion) {
      hostDashIndex = hostVersion.indexOf("-");
      return hostDashIndex >= 0 ? hostVersion.slice(0, hostDashIndex) : hostVersion;
    }
    return spec && (spec.version || spec.schemaVersion || spec.apiVersion || null);
  }

  function getBoardId() {
    var info = __getDashboardAPI().getDashboardInfo();
    var boardId;
    var asString;
    if (info == null || isThenable(info)) return null;
    boardId = info.boardId;
    if (typeof boardId === "string" || typeof boardId === "number") {
      asString = String(boardId);
      if (asString) return asString;
    }
    return null;
  }

  var PATH_REF_ROOT_BY_FIRST_NAME = {
    "Public Folders": ".public_folders",
    "Öffentliche Ordner": ".public_folders",
    "Team Folders": ".team_folders",
    "Teamordner": ".team_folders",
    "My Folders": ".my_folders",
    "Meine Ordner": ".my_folders"
  };

  function readSearchPathNames(text) {
    var names = [];
    var match;
    var pattern = /\[@name='((?:\\'|[^'])*)'\]/g;
    while ((match = pattern.exec(text)) !== null) {
      names.push(match[1].replace(/\\'/g, "'"));
    }
    return names;
  }

  function convertSearchPathToPathRef(searchPath) {
    var text;
    var names;
    var firstName;
    var root;
    var rest;
    if (typeof searchPath === "number") searchPath = String(searchPath);
    if (typeof searchPath !== "string") return null;
    text = searchPath.trim();
    if (!text) return null;
    if (text.charAt(0) === ".") return text;
    names = readSearchPathNames(text);
    firstName = names.length ? names[0] : "";
    if (firstName && Object.prototype.hasOwnProperty.call(PATH_REF_ROOT_BY_FIRST_NAME, firstName)) {
      root = PATH_REF_ROOT_BY_FIRST_NAME[firstName];
      rest = names.slice(1);
    } else if (text.indexOf("/content") === 0) {
      root = ".public_folders";
      rest = names;
    } else {
      return null;
    }
    if (!rest.length) return null;
    return root + "/" + rest.join("/");
  }

  function getPathRef() {
    var info = __getDashboardAPI().getDashboardInfo();
    if (info == null || isThenable(info)) return null;
    return convertSearchPathToPathRef(info.searchPath);
  }

  function getUserName() {
    var account = __getDashboardAPI().getFeature("UserProfile").getUserAccount();
    var userName;
    var asString;
    if (account == null || isThenable(account)) return null;
    userName = account.userName;
    if (typeof userName === "string" || typeof userName === "number") {
      asString = String(userName).trim();
      if (asString) return asString;
    }
    return null;
  }

  function ensureTrailingSlash(_value) {
    if (!_value) return _value;
    return _value.charAt(_value.length - 1) === "/" ? _value : _value + "/";
  }

  function getDashboardBiBaseUrl() {
    var locationRef = typeof document !== "undefined" ? document.location : null;
    var href;
    var match;
    if (!locationRef) return null;
    href = locationRef.href;
    match = href && href.match(/^(.*?\/cognos\/bi\/)/i);
    return ensureTrailingSlash(match ? match[1] : locationRef.origin + "/cognos/bi/");
  }

  function getCurrentDashboardUiState() {
    var state = __getDashboardAPI().getFeature("DashboardState");
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
  }

  function createDashboardApi() {
    return {
      // console helper / host knowledge base, no app caller
      getDashboardState: function () {
        return __getDashboardAPI().getFeature("DashboardState");
      },

      // Cognos DashboardState.onUiStateChange contract (legacy-aligned).
      onDashboardUiStateChange: function (_callback) {
        return __getDashboardAPI().getFeature("DashboardState").onUiStateChange(_callback);
      },

      getCurrentDashboardUiState: getCurrentDashboardUiState,

      // console helper / host knowledge base, no app caller
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

      getUserName: getUserName,

      getFileName: function () {
        return __getDashboardAPI().getSpec().name;
      },

      getDashboardVersion: getDashboardVersion,

      getEnvironmentSource: function () {
        return typeof document !== "undefined" && document.location
          ? document.location.href
          : null;
      },

      getBoardId: getBoardId,

      getPathRef: getPathRef,

      getDashboardBiBaseUrl: getDashboardBiBaseUrl,

      resolveCaptureRoot: function (_tabLike) {
        return _resolveCaptureRoot(_tabLike);
      },

      // Expects a boolean accepted by DashboardState.setFullScreen.
      setFullScreen: function (_state) {
        return __getDashboardAPI().getFeature("DashboardState").setFullScreen(_state);
      },

      // _zoomValue is a Canvas defaultZoom value (e.g. "fitPage"); defaults to "fitPage" when omitted.
      setDashboardZoom: function (_zoomValue) {
        var zoomValue = _zoomValue === undefined ? "fitPage" : _zoomValue;
        return __getDashboardAPI()
          .getCanvasWhenReady()
          .then(function (canvasApi) {
            return canvasApi.setPropertyValue("defaultZoom", zoomValue);
          });
      },

      openAppView: function (_viewName) {
        return __getDashboardAPI().openAppView(_viewName);
      }
    };
  }

  return createDashboardApi;
});

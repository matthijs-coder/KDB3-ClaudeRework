define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js"
], function (_outcome, _errorCodes, _hostAccess) {
  "use strict";

  // Primitive reads of the dashboard host (dynamic method lookup) and the flat UI-state DTO
  // of subscribeUiState. The method names below are looked up on _KDB.cognosAPI.dashboard
  // and are frozen: a rename fails silently as DASHBOARD_HOST_CAPABILITY_MISSING.
  var CODES = _errorCodes.dashboard;
  var VALUE_GETTER_NAMES = [
    "getFileName",
    "getDashboardVersion",
    "getEnvironmentSource",
    "getBoardId",
    "getPathRef",
    "getDashboardBiBaseUrl",
    "getLanguage",
    "getUserName",
    "getMode"
  ];

  function failRead(_message) {
    return _outcome.buildFailed(CODES.READ_FAILED, [_outcome.buildDiagnostic(CODES.READ_FAILED, _message)]);
  }

  // Only primitives cross the facet boundary: no host Promise, no live object.
  function normalizeHostValue(_value) {
    if (_value == null) {
      return _outcome.buildOk(null);
    }
    if (_hostAccess.isThenable(_value)) {
      return failRead("host returned a Promise");
    }
    if (typeof _value === "object" || typeof _value === "function") {
      return failRead("host returned a live object");
    }
    return _outcome.buildOk(_value);
  }

  function readDashboardHostValue(_ctx, _methodName) {
    var resolved;
    if (_hostAccess.isFacetStale(_ctx)) {
      return _outcome.buildDisposed();
    }
    try {
      resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "dashboard", _methodName, CODES);
      if (resolved.failure) {
        return resolved.failure;
      }
      return normalizeHostValue(resolved.api[_methodName]());
    } catch (error) {
      console.error("[cognosHost.dashboard." + _methodName + "] failed", error);
      return failRead(error && error.message ? error.message : String(error));
    }
  }

  function createValueGetters(_ctx) {
    var getters = {};
    VALUE_GETTER_NAMES.forEach(function addGetter(_name) {
      getters[_name] = readDashboardHostValue.bind(null, _ctx, _name);
    });
    return getters;
  }

  function isPrimitive(_value) {
    var valueType = typeof _value;
    return _value == null || valueType === "string" || valueType === "number" || valueType === "boolean";
  }

  function readMode(_uiState, _dashboardApi) {
    var mode;
    if (_dashboardApi && typeof _dashboardApi.getMode === "function") {
      try {
        mode = _dashboardApi.getMode();
      } catch (_error) {
        mode = undefined;
      }
    }
    if (mode !== undefined && isPrimitive(mode) && !_hostAccess.isThenable(mode)) {
      return mode == null ? null : mode;
    }
    if (_uiState && isPrimitive(_uiState.mode) && !_hostAccess.isThenable(_uiState.mode)) {
      return _uiState.mode == null ? null : _uiState.mode;
    }
    return null;
  }

  // Flat DTO { authoring, mode } for the boot snapshot and later host events. Never returns the
  // live uiState; authoring is strictly uiState.authoring === true.
  function buildUiStateSnapshot(_uiState, _dashboardApi) {
    var uiState = _hostAccess.isThenable(_uiState) ? null : _uiState;
    return {
      authoring: !!(uiState && uiState.authoring === true),
      mode: readMode(uiState, _dashboardApi)
    };
  }

  return {
    createValueGetters: createValueGetters,
    buildUiStateSnapshot: buildUiStateSnapshot
  };
});

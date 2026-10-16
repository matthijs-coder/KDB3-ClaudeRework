define([], function () {
  "use strict";

  // Flat DTO for subscribeUiState (boot snapshot and later host events).
  // Copies only primitives. Never returns the live uiState object and never
  // returns a host Promise. authoring is strictly uiState.authoring === true.
  function isThenable(_value) {
    return !!(
      _value &&
      (typeof _value === "object" || typeof _value === "function") &&
      typeof _value.then === "function"
    );
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
    if (mode !== undefined && isPrimitive(mode) && !isThenable(mode)) {
      return mode == null ? null : mode;
    }
    if (_uiState && isPrimitive(_uiState.mode) && !isThenable(_uiState.mode)) {
      return _uiState.mode == null ? null : _uiState.mode;
    }
    return null;
  }

  function buildUiStateSnapshot(_uiState, _dashboardApi) {
    var uiState = isThenable(_uiState) ? null : _uiState;
    return {
      authoring: !!(uiState && uiState.authoring === true),
      mode: readMode(uiState, _dashboardApi)
    };
  }

  return buildUiStateSnapshot;
});

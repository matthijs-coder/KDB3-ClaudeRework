define([
  "../events/eventNames",
  "./reduceFrameworkActions",
  "./reduceSettingsActions",
  "./copyState",
], function (_eventNames, _reduceFrameworkActions, _reduceSettingsActions, _copyState) {
  "use strict";
  function reduceError(state, action) {
    var base = state || {};
    var c = _copyState.copyState(base);
    c.lifecycle = "error";
    c.errorCode = action.payload && action.payload.errorCode;
    c.errorMessage = action.payload && action.payload.errorMessage;
    return c;
  }
  function reduceInit(state) {
    var a = _copyState.copyState(state);
    a.lifecycle = "mounted";
    return a;
  }
  function reduceDestroy(state) {
    var b = _copyState.copyState(state);
    b.lifecycle = "disposed";
    return b;
  }
  function reducer(state, action) {
    if (!action) return state;
    var t = action.type;
    if (t === _eventNames.ACTION_ERROR || t === "kdbControl/error") return reduceError(state, action);
    if (!state) return state;
    if (t === _eventNames.ACTION_INIT || t === "kdbControl/init") return reduceInit(state);
    if (t === _eventNames.ACTION_DESTROY || t === "kdbControl/destroy") return reduceDestroy(state);
    if (t === _eventNames.ACTION_FRAMEWORK_SELECT_PANEL) return _reduceFrameworkActions(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_TOGGLE_COLLAPSE) return _reduceFrameworkActions(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_TOGGLE_SECTION) return _reduceFrameworkActions(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT) return _reduceFrameworkActions(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION) {
      return _reduceFrameworkActions(state, action);
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_COLOR) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_CHROME) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE) return _reduceSettingsActions(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE) return _reduceSettingsActions(state, action);
    return state;
  }
  function createKdbControlReducer() {
    return reducer;
  }
  return createKdbControlReducer;
});

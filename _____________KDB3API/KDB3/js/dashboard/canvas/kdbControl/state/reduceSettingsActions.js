define(["../events/eventNames", "./copyState"], function (_eventNames, _copyState) {
  "use strict";
  function reduceSettingsSetDashboardDimension(state, action) {
    var p = action.payload;
    var dim = p && p.dimension;
    if (dim !== "width" && dim !== "height") return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.dashboard[dim] = String((p && p.value) != null ? p.value : "");
    return next;
  }
  function reduceSettingsSetDashboardColor(state, action) {
    var p = action.payload;
    if (!p || typeof p.value === "undefined") return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.dashboard.backgroundColor = String(p.value != null ? p.value : "");
    return next;
  }
  function reduceSettingsSetControlPanelColor(state, action) {
    var p = action.payload;
    var role = p && p.role;
    var key =
      role === "background"
        ? "backgroundColor"
        : role === "button"
          ? "buttonColor"
          : role === "actionButton"
            ? "actionButtonColor"
            : role === "innerBackground"
              ? "innerBackgroundColor"
              : null;
    if (!key) return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.controlPanel[key] = String((p && p.value) != null ? p.value : "");
    return next;
  }
  function reduceSettingsSetVisualizationDefault(state, action) {
    var p = action.payload;
    var field = p && p.field;
    if (field !== "width" && field !== "height" && field !== "backgroundColor") return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.defaultsNew.visualization[field] = String((p && p.value) != null ? p.value : "");
    return next;
  }
  function reduceSettingsSetCommentDefault(state, action) {
    var p = action.payload;
    var field = p && p.field;
    if (field !== "width" && field !== "height" && field !== "backgroundColor") return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.defaultsNew.comment[field] = String((p && p.value) != null ? p.value : "");
    return next;
  }
  function reduceSettingsToggleDashboardChrome(state, action) {
    var p = action.payload;
    var key = p && p.key;
    if (key !== "hideWidgetSettingsButtons") return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.dashboard[key] = !next.settings.dashboard[key];
    return next;
  }
  function reduceSettingsSetDashboardChrome(state, action) {
    var p = action.payload;
    var key = p && p.key;
    if (key !== "hideWidgetSettingsButtons") return state;
    if (typeof p.hidden !== "boolean") return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    if (next.settings.dashboard[key] === p.hidden) return state;
    next.settings.dashboard[key] = p.hidden;
    return next;
  }
  function reduceSettingsToggleDeveloperMode(state) {
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.dashboard.isDeveloperMode = !next.settings.dashboard.isDeveloperMode;
    return next;
  }
  function reduceSettingsSetDeveloperMode(state, action) {
    var p = action.payload;
    var value = !!(p && p.value);
    var current = !!(state && state.settings && state.settings.dashboard && state.settings.dashboard.isDeveloperMode);
    if (value === current) return state;
    var next = _copyState.copyState(state);
    next.settings = _copyState.copySettingsFromState(state);
    next.settings.dashboard.isDeveloperMode = value;
    return next;
  }
  function reduceSettingsActions(state, action) {
    var t = action.type;
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) return reduceSettingsSetDashboardDimension(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_COLOR) return reduceSettingsSetDashboardColor(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR) return reduceSettingsSetControlPanelColor(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT) return reduceSettingsSetVisualizationDefault(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT) return reduceSettingsSetCommentDefault(state, action);
    if (t === _eventNames.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME) return reduceSettingsToggleDashboardChrome(state, action);
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_CHROME) return reduceSettingsSetDashboardChrome(state, action);
    if (t === _eventNames.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE) return reduceSettingsToggleDeveloperMode(state);
    if (t === _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE) return reduceSettingsSetDeveloperMode(state, action);
    return state;
  }
  return reduceSettingsActions;
});

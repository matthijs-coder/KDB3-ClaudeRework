define([], function () {
  "use strict";
  /** CP-1: header/footer toolbox uses direct `_KDB.api.header/footer.dispatch`; request names below are legacy catalog keys only (no emitters). */
  return {
    ACTION_INIT: "kdbControl/init",
    ACTION_DESTROY: "kdbControl/destroy",
    ACTION_ERROR: "kdbControl/error",
    ACTION_FRAMEWORK_SELECT_PANEL: "kdbControl/framework/selectPanel",
    ACTION_FRAMEWORK_TOGGLE_COLLAPSE: "kdbControl/framework/toggleCollapse",
    ACTION_FRAMEWORK_TOGGLE_SECTION: "kdbControl/framework/toggleSection",
    ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT: "kdbControl/framework/setPlaceholderInput",
    ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION: "kdbControl/framework/setPlaceholderSelection",
    ACTION_SETTINGS_SET_DASHBOARD_DIMENSION: "kdbControl/settings/setDashboardDimension",
    ACTION_SETTINGS_SET_DASHBOARD_COLOR: "kdbControl/settings/setDashboardColor",
    ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR: "kdbControl/settings/setControlPanelColor",
    ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT: "kdbControl/settings/setVisualizationDefault",
    ACTION_SETTINGS_SET_COMMENT_DEFAULT: "kdbControl/settings/setCommentDefault",
    ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME: "kdbControl/settings/toggleDashboardChrome",
    ACTION_SETTINGS_SET_DASHBOARD_CHROME: "kdbControl/settings/setDashboardChrome",
    ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE: "kdbControl/settings/toggleDeveloperMode",
    ACTION_SETTINGS_SET_DEVELOPER_MODE: "kdbControl/settings/setDeveloperMode",
    ACTION_REPLAY_SETTINGS: "kdbControl/replaySettings",
    ACTION_PARAMETER_SET_RESTORE: "kdbControl/parameterSetRestoreRequested",
    HEADER_TOGGLE_REQUESTED: "header:toggleRequested",
    HEADER_EDIT_REQUESTED: "header:editRequested",
    HEADER_SUBTITLE_TOGGLE_REQUESTED: "header:subtitleToggleRequested",
    HEADER_SUBTITLE_EDIT_REQUESTED: "header:subtitleEditRequested",
    FOOTER_TOGGLE_REQUESTED: "footer:toggleRequested",
    TABS_TOOL_REQUESTED: "tabs:toolRequested",
  };
});

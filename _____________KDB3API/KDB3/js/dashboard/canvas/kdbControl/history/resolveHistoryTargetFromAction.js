define(["../events/eventNames"], function (_eventNames) {
  "use strict";

  function resolveHistoryTargetFromAction(_action) {
    if (!_action || typeof _action.type !== "string") {
      return null;
    }
    var t = _action.type;
    var p = _action.payload || {};
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) {
      if (p.dimension === "width") return "dashboard.width";
      if (p.dimension === "height") return "dashboard.height";
      return null;
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_COLOR) {
      return "dashboard.backgroundColor";
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR) {
      if (p.role === "background") return "controlPanel.backgroundColor";
      if (p.role === "button") return "controlPanel.buttonColor";
      if (p.role === "actionButton") return "controlPanel.actionButtonColor";
      if (p.role === "innerBackground") return "controlPanel.innerBackgroundColor";
      return null;
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT) {
      if (p.field === "width") return "defaults.visualization.width";
      if (p.field === "height") return "defaults.visualization.height";
      if (p.field === "backgroundColor") return "defaults.visualizationBackgroundColor";
      return null;
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT) {
      if (p.field === "width") return "defaults.text.width";
      if (p.field === "height") return "defaults.text.height";
      if (p.field === "backgroundColor") return "defaults.textBackgroundColor";
      return null;
    }
    if (t === _eventNames.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME || t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_CHROME) {
      if (p.key === "hideWidgetSettingsButtons") return "dashboard.areSettingsButtonsHidden";
    }
    if (t === _eventNames.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE || t === _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE) {
      return "dashboard.isDeveloperMode";
    }
    return null;
  }

  return resolveHistoryTargetFromAction;
});

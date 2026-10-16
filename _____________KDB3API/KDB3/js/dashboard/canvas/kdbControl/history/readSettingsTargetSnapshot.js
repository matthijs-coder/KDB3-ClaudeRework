define([], function () {
  "use strict";

  function readString(val) {
    return val == null ? "" : String(val);
  }

  function readSettingsTargetSnapshot(_state, _target) {
    var settings = _state && _state.settings;
    if (!settings || typeof _target !== "string") {
      return null;
    }
    var dash = settings.dashboard || {};
    var panel = settings.controlPanel || {};
    var defaultsNew = settings.defaultsNew || {};
    var vis = defaultsNew.visualization || {};
    var comment = defaultsNew.comment || {};

    switch (_target) {
      case "dashboard.width":
        return { value: readString(dash.width) };
      case "dashboard.height":
        return { value: readString(dash.height) };
      case "dashboard.backgroundColor":
        return { value: readString(dash.backgroundColor) };
      case "controlPanel.backgroundColor":
        return { value: readString(panel.backgroundColor) };
      case "controlPanel.buttonColor":
        return { value: readString(panel.buttonColor) };
      case "controlPanel.actionButtonColor":
        return { value: readString(panel.actionButtonColor) };
      case "controlPanel.innerBackgroundColor":
        return { value: readString(panel.innerBackgroundColor) };
      case "defaults.visualization.width":
        return { value: readString(vis.width) };
      case "defaults.visualization.height":
        return { value: readString(vis.height) };
      case "defaults.text.width":
        return { value: readString(comment.width) };
      case "defaults.text.height":
        return { value: readString(comment.height) };
      case "defaults.visualizationBackgroundColor":
        return { value: readString(vis.backgroundColor) };
      case "defaults.textBackgroundColor":
        return { value: readString(comment.backgroundColor) };
      case "dashboard.areSettingsButtonsHidden":
        return { value: dash.hideWidgetSettingsButtons === true };
      case "dashboard.isDeveloperMode":
        return { value: dash.isDeveloperMode === true };
      default:
        return null;
    }
  }

  return readSettingsTargetSnapshot;
});

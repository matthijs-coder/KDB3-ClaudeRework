define([], function () {
  "use strict";

  function readText(value) {
    return value != null ? String(value) : "";
  }

  function readDashboardSettings(state) {
    var dashboard = state && state.settings && state.settings.dashboard;
    if (!dashboard) {
      return { width: "", height: "", backgroundColor: "", hideWidgetSettingsButtons: true, isDeveloperMode: false };
    }
    return {
      width: readText(dashboard.width),
      height: readText(dashboard.height),
      backgroundColor: readText(dashboard.backgroundColor),
      hideWidgetSettingsButtons: !!dashboard.hideWidgetSettingsButtons,
      isDeveloperMode: !!dashboard.isDeveloperMode
    };
  }

  function readControlPanelSettings(state) {
    var panel = state && state.settings && state.settings.controlPanel;
    if (!panel) {
      return { backgroundColor: "", buttonColor: "", actionButtonColor: "", innerBackgroundColor: "" };
    }
    return {
      backgroundColor: readText(panel.backgroundColor),
      buttonColor: readText(panel.buttonColor),
      actionButtonColor: readText(panel.actionButtonColor),
      innerBackgroundColor: readText(panel.innerBackgroundColor)
    };
  }

  function readWidgetDefaults(source) {
    if (!source) return { width: "", height: "", backgroundColor: "" };
    return {
      width: readText(source.width),
      height: readText(source.height),
      backgroundColor: readText(source.backgroundColor)
    };
  }

  function readVisualizationDefaults(state) {
    return readWidgetDefaults(state && state.settings && state.settings.defaultsNew && state.settings.defaultsNew.visualization);
  }

  function readCommentDefaults(state) {
    return readWidgetDefaults(state && state.settings && state.settings.defaultsNew && state.settings.defaultsNew.comment);
  }

  function readFrameworkActiveTopPanel(state) {
    return state && state.framework ? state.framework.activeTopPanel : undefined;
  }

  function readFrameworkOpenSectionId(state) {
    return state && state.framework ? state.framework.openSectionId : undefined;
  }

  function readFrameworkCollapsed(state) {
    return state && state.framework ? !!state.framework.isCollapsed : false;
  }

  function readFrameworkPlaceholderInputs(state) {
    return state && state.framework && state.framework.placeholderInputs ? state.framework.placeholderInputs : {};
  }

  function readFrameworkPlaceholderSelections(state) {
    return state && state.framework && state.framework.placeholderSelections ? state.framework.placeholderSelections : {};
  }

  return {
    readDashboardSettings: readDashboardSettings,
    readControlPanelSettings: readControlPanelSettings,
    readVisualizationDefaults: readVisualizationDefaults,
    readCommentDefaults: readCommentDefaults,
    readFrameworkActiveTopPanel: readFrameworkActiveTopPanel,
    readFrameworkOpenSectionId: readFrameworkOpenSectionId,
    readFrameworkCollapsed: readFrameworkCollapsed,
    readFrameworkPlaceholderInputs: readFrameworkPlaceholderInputs,
    readFrameworkPlaceholderSelections: readFrameworkPlaceholderSelections
  };
});

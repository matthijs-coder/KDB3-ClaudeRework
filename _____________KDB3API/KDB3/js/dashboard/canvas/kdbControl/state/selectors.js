define([], function () {

  "use strict";

  function defaultDashboard() {
    return {
      width: "",
      height: "",
      backgroundColor: "",
      hideWidgetSettingsButtons: true,
      isDeveloperMode: false,
    };
  }

  function defaultControlPanel() {
    return {
      backgroundColor: "",
      buttonColor: "",
      actionButtonColor: "",
      innerBackgroundColor: "",
    };
  }

  function defaultVisualization() {
    return { width: "", height: "", backgroundColor: "" };
  }

  function defaultComment() {
    return { width: "", height: "", backgroundColor: "" };
  }

  return {

    readDashboardSettings: function (s) {
      var d = s && s.settings && s.settings.dashboard;
      if (!d) return defaultDashboard();
      return {
        width: d.width != null ? String(d.width) : "",
        height: d.height != null ? String(d.height) : "",
        backgroundColor: d.backgroundColor != null ? String(d.backgroundColor) : "",
        hideWidgetSettingsButtons: !!d.hideWidgetSettingsButtons,
        isDeveloperMode: !!d.isDeveloperMode,
      };
    },

    readControlPanelSettings: function (s) {
      var c = s && s.settings && s.settings.controlPanel;
      if (!c) return defaultControlPanel();
      return {
        backgroundColor: c.backgroundColor != null ? String(c.backgroundColor) : "",
        buttonColor: c.buttonColor != null ? String(c.buttonColor) : "",
        actionButtonColor: c.actionButtonColor != null ? String(c.actionButtonColor) : "",
        innerBackgroundColor: c.innerBackgroundColor != null ? String(c.innerBackgroundColor) : "",
      };
    },

    readVisualizationDefaults: function (s) {
      var v = s && s.settings && s.settings.defaultsNew && s.settings.defaultsNew.visualization;
      if (!v) return defaultVisualization();
      return {
        width: v.width != null ? String(v.width) : "",
        height: v.height != null ? String(v.height) : "",
        backgroundColor: v.backgroundColor != null ? String(v.backgroundColor) : "",
      };
    },

    readCommentDefaults: function (s) {
      var c = s && s.settings && s.settings.defaultsNew && s.settings.defaultsNew.comment;
      if (!c) return defaultComment();
      return {
        width: c.width != null ? String(c.width) : "",
        height: c.height != null ? String(c.height) : "",
        backgroundColor: c.backgroundColor != null ? String(c.backgroundColor) : "",
      };
    },

    readFrameworkActiveTopPanel: function (s) {

      return s && s.framework ? s.framework.activeTopPanel : undefined;

    },

    readFrameworkOpenSectionId: function (s) {

      return s && s.framework ? s.framework.openSectionId : undefined;

    },

    readFrameworkCollapsed: function (s) {

      return s && s.framework ? !!s.framework.isCollapsed : false;

    },

    readFrameworkPlaceholderInputs: function (s) {

      return s && s.framework && s.framework.placeholderInputs ? s.framework.placeholderInputs : {};

    },

    readFrameworkPlaceholderSelections: function (s) {

      return s && s.framework && s.framework.placeholderSelections ? s.framework.placeholderSelections : {};

    },

  };

});

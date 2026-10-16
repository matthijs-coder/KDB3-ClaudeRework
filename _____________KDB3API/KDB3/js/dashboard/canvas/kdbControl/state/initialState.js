define(["../config/settingsDefaults.js"], function (_defaults) {
  "use strict";

  // Default export is read by core/services/writeback/get/collectors/collectCanvasSettings.js (`initialState().settings`).
  function initialState() {
    var dimensions = _defaults.dimensions;
    var colors = _defaults.colorInputs;
    return {
      lifecycle: "idle",
      framework: {
        activeTopPanel: "metrics",
        openSectionId: null,
        isCollapsed: false,
        placeholderInputs: {},
        // Dashboard chrome toggles live in settings.dashboard booleans only.
        placeholderSelections: {}
      },
      toolbox: {},
      settings: {
        dashboard: {
          width: dimensions.dashboard.width.default,
          height: dimensions.dashboard.height.default,
          backgroundColor: colors.dashboardBg,
          hideWidgetSettingsButtons: true,
          isDeveloperMode: false
        },
        controlPanel: {
          backgroundColor: colors.panelBg,
          buttonColor: colors.panelButton,
          actionButtonColor: colors.panelActionButton,
          innerBackgroundColor: colors.panelInnerBg
        },
        defaultsNew: {
          visualization: {
            width: dimensions.visualization.width.default,
            height: dimensions.visualization.height.default,
            backgroundColor: colors.graphBg
          },
          comment: {
            width: dimensions.comment.width.default,
            height: dimensions.comment.height.default,
            backgroundColor: colors.commentBg
          }
        }
      },
      authoringMode: {}
    };
  }

  return initialState;
});

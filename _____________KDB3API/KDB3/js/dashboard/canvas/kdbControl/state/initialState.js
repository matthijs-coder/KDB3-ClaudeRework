define(["../settings/config/settingsDimensionConfig", "../settings/config/settingsColorDefaults"], function (_dimCfg, _colorDefaults) {

  "use strict";

  function initialState() {

    return {

      lifecycle: "idle",

      framework: {

        activeTopPanel: "metrics",

        openSectionId: null,

        isCollapsed: false,

        placeholderInputs: {},

        /* CP-1: dashboard chrome toggles live in settings.dashboard booleans only. */

        placeholderSelections: {},

      },

      toolbox: {},

      settings: {

        dashboard: {

          width: _dimCfg.dashboard.width.default,

          height: _dimCfg.dashboard.height.default,

          backgroundColor: _colorDefaults.colorInputs.dashboardBg,

          hideWidgetSettingsButtons: true,

          isDeveloperMode: false,

        },

        controlPanel: {

          backgroundColor: _colorDefaults.colorInputs.panelBg,

          buttonColor: _colorDefaults.colorInputs.panelButton,

          actionButtonColor: _colorDefaults.colorInputs.panelActionButton,
          innerBackgroundColor: _colorDefaults.colorInputs.panelInnerBg,

        },

        defaultsNew: {

          visualization: {
            width: _dimCfg.visualization.width.default,
            height: _dimCfg.visualization.height.default,
            backgroundColor: _colorDefaults.colorInputs.graphBg,
          },

          comment: {
            width: _dimCfg.comment.width.default,
            height: _dimCfg.comment.height.default,
            backgroundColor: _colorDefaults.colorInputs.commentBg,
          },

        },

      },

      authoringMode: {},

    };

  }

  return initialState;

});
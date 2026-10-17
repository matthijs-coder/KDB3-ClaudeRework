/*
 * Default canvas settings (dashboard size and colour, control panel colours, new visualization / comment widget
 * size and colour). kdbControl seeds its state from them and writeback emits only the deltas against them, so the
 * values live in core/config and neither side imports the other.
 *
 *   dimensions               minimum (validation/clamp) and default per target; dashboard defaults are px, widget defaults cm
 *   colorInputs              default colour per colour input (`data-placeholder-input-id`)
 *   createDefaultSettings()  a fresh `state.kdbControl.settings` tree built from the two tables above
 */
define([], function () {
  "use strict";

  var DIMENSIONS = {
    dashboard: {
      width: { minimum: "200mm", default: "1800px" },
      height: { minimum: "150mm", default: "800px" }
    },
    visualization: {
      width: { minimum: "40mm", default: "10cm" },
      height: { minimum: "30mm", default: "10cm" }
    },
    comment: {
      width: { minimum: "25mm", default: "15cm" },
      height: { minimum: "20mm", default: "5cm" }
    }
  };

  // Panel and action colours mirror the shell defaults (#kdb-control-content #fff, arrow #c0c0c0),
  // action-buttons.css (.kdb-control_action-button #0056b3) and toggle-button.css
  // (--kdb-control-steuerung-switch-on fallback #0056b3).
  var COLOR_INPUTS = {
    dashboardBg: "#ffffff",
    graphBg: "#ffffff",
    commentBg: "#00000000",
    panelBg: "#ffffff",
    panelButton: "#c0c0c0",
    panelActionButton: "#0056b3",
    panelInnerBg: "#fafafa"
  };

  function createDefaultSettings() {
    return {
      dashboard: {
        width: DIMENSIONS.dashboard.width.default,
        height: DIMENSIONS.dashboard.height.default,
        backgroundColor: COLOR_INPUTS.dashboardBg,
        hideWidgetSettingsButtons: true,
        isDeveloperMode: false
      },
      controlPanel: {
        backgroundColor: COLOR_INPUTS.panelBg,
        buttonColor: COLOR_INPUTS.panelButton,
        actionButtonColor: COLOR_INPUTS.panelActionButton,
        innerBackgroundColor: COLOR_INPUTS.panelInnerBg
      },
      defaultsNew: {
        visualization: {
          width: DIMENSIONS.visualization.width.default,
          height: DIMENSIONS.visualization.height.default,
          backgroundColor: COLOR_INPUTS.graphBg
        },
        comment: {
          width: DIMENSIONS.comment.width.default,
          height: DIMENSIONS.comment.height.default,
          backgroundColor: COLOR_INPUTS.commentBg
        }
      }
    };
  }

  return { dimensions: DIMENSIONS, colorInputs: COLOR_INPUTS, createDefaultSettings: createDefaultSettings };
});

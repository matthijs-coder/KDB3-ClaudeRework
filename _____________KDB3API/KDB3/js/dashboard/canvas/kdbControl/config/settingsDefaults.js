define([], function () {
  "use strict";

  // Dimensions: minimum (validation/clamp) and default (init + DOM).
  // Dashboard defaults are px; diagram follows REDESIGN2 visualizationsPropId (cm); comment follows textWidgetPropId (cm).
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

  // Default colour per colour input (`data-placeholder-input-id`), hex/CSS colours.
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

  return {
    dimensions: DIMENSIONS,
    colorInputs: COLOR_INPUTS,
    // Fallback when the palette has no entry named `default`.
    defaultPaletteOptionHex: "#ffffff",
    paletteSwatches: [
      ["default", "#ffffff"],
      ["transparent", "#00000000"],
      ["abendstimmung", "#49274b"],
      ["frischgruen", "#82d282"],
      ["goldgelb", "#e6c828"],
      ["wienrot", "#ff0000"]
    ]
  };
});

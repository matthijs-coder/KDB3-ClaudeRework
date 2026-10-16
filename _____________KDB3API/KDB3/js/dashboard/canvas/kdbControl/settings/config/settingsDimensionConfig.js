define([], function () {
  "use strict";
  /**
   * Centrale dimensies: minimum (validatie/clamp) en default (init + DOM).
   * Dashboard-defaults: px. Diagram: REDESIGN2 visualizationsPropId (cm). Comment: textWidgetPropId (cm).
   */
  return {
    dashboard: {
      width: { minimum: "200mm", default: "1800px" },
      height: { minimum: "150mm", default: "800px" },
    },
    visualization: {
      width: { minimum: "40mm", default: "10cm" },
      height: { minimum: "30mm", default: "10cm" },
    },
    comment: {
      width: { minimum: "25mm", default: "15cm" },
      height: { minimum: "20mm", default: "5cm" },
    },
  };
});

define([], function () {
  "use strict";
  /**
   * Per kleurinput (`data-placeholder-input-id`). Hex/CSS-kleuren.
   * Paneel/actie: zie shell defaults (#kdb-control-content #fff, arrow #c0c0c0),
   * `action-buttons.css` (.kdb-control_action-button #0056b3),
   * `toggle-button.css` (--kdb-control-steuerung-switch-on fallback #0056b3).
   */
  return {
    /** Fallback als palette geen entry `default` heeft. */
    defaultPaletteOptionHex: "#ffffff",
    colorInputs: {
      dashboardBg: "#ffffff",
      graphBg: "#ffffff",
      commentBg: "#00000000",
      panelBg: "#ffffff",
      panelButton: "#c0c0c0",
      panelActionButton: "#0056b3",
      panelInnerBg: "#fafafa",
    },
  };
});

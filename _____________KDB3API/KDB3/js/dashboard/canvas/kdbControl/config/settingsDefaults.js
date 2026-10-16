define(["../../../../core/config/canvasSettingsDefaults.js"], function (_canvasSettingsDefaults) {
  "use strict";

  return {
    // Dimensions (minimum/default) and colour defaults are shared with writeback and live in core/config.
    dimensions: _canvasSettingsDefaults.dimensions,
    colorInputs: _canvasSettingsDefaults.colorInputs,
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

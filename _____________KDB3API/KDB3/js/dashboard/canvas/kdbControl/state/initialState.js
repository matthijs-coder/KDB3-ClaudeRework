define(["../../../../core/config/canvasSettingsDefaults.js"], function (_canvasSettingsDefaults) {
  "use strict";

  function initialState() {
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
      settings: _canvasSettingsDefaults.createDefaultSettings(),
      authoringMode: {}
    };
  }

  return initialState;
});

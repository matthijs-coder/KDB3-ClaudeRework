define([
  "../config/sichtDefinitions.js"
], function (_sichtDefinitions) {
  "use strict";

  function createOptionState(_definition) {
    return {
      displayValue: _definition.displayValue,
      useValue: "",
      optionTableKey: _definition.optionTableKey,
      defaultTableKey: _definition.defaultTableKey,
      isVisible: false,
      isDefaultReady: false,
      isEnabled: false,
      lastSyncedAt: null
    };
  }

  function initialState() {
    var byOption = {};
    Object.keys(_sichtDefinitions).forEach(function (_key) {
      byOption[_key] = createOptionState(_sichtDefinitions[_key]);
    });
    return {
      lifecycle: "idle",
      activeSichtValue: null,
      activeFilterInstanceId: null,
      currentSelection: {
        displayValue: "",
        useValue: "",
        displaySource: "unavailable"
      },
      backupSelection: {
        displayValue: "",
        useValue: "",
        displaySource: "unavailable"
      },
      pendingSelection: { displayValue: "" },
      byOption: byOption,
      meta: {
        lastHandoffAt: null,
        lastCommittedAt: null,
        lastInventoryGeneration: null,
        lastInventorySource: null,
        lastInventoryAt: null,
        startupDefaultCommitted: false,
        startupDefaultInProgress: false
      },
      lastHistoryStep: null,
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});

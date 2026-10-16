define([
  "../config/specialFilterDefinitions.js"
], function (_specialFilterDefinitions) {
  "use strict";

  function createPerFilterState(_definition) {
    return {
      filterLabel: _definition.filterLabel,
      filterKey: null,
      rightTableKey: _definition.rightTableKey,
      optionTableKey: _definition.optionTableKey,
      rightAllowed: false,
      alleAllowed: false,
      isVisibleForSicht: false,
      isVisible: false,
      selectionSource: "none",
      selectionSourceByInstanceId: {},
      wasSetBySpecialSingleSelect: false,
      parkedSelectionsByInstanceId: {},
      lastAppliedUseValue: null,
      lastAppliedDisplayValue: null,
      lastPolicyAppliedAt: null,
      lastSyncedAt: null,
      errorCode: null,
      errorMessage: null
    };
  }

  function initialState() {
    var byFilterId = {};
    Object.keys(_specialFilterDefinitions).forEach(function (_filterId) {
      byFilterId[_filterId] = createPerFilterState(_specialFilterDefinitions[_filterId]);
    });
    return {
      lifecycle: "idle",
      activeSichtValue: null,
      byFilterId: byFilterId,
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});

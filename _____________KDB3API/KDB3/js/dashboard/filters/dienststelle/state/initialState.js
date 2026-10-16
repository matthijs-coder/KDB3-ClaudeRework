define([], function () {
  "use strict";

  function createEmptyResolution() {
    return {
      activeFilterKey: null,
      visibleFilterLabel: "Dienststelle",
      dominantScope: null,
      dominantValues: [],
      downstreamValues: [],
      pageContextValuesByScope: {},
      resolvedAt: null
    };
  }

  function initialState() {
    return {
      lifecycle: "idle",
      activeSichtValue: null,
      activeFilterKey: null,
      visibleFilterLabel: "Dienststelle",
      activeHierarchyTableKey: null,
      activeDefaultTableKey: null,
      byFilter: {},
      resolution: createEmptyResolution(),
      defaults: {},
      replay: {
        isApplyingHistory: false,
        lastAppliedAt: null
      },
      meta: {
        lastFilterDockHandoffAt: null,
        lastSichtChangeAt: null,
        lastConfirmedAt: null
      },
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});

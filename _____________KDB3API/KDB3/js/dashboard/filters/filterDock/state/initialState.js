define([], function () {
  "use strict";

  function initialState() {
    return {
      lifecycle: "idle",
      lastClickedFilter: null,
      popup: {
        isVisible: false,
        activeFilterId: null,
        activeFilterType: null,
        hasOptions: false,
        optionCount: 0,
        hasOkButton: false,
        hasCancelButton: false,
        observedAt: 0
      },
      observedChildren: {
        addedCount: 0,
        removedCount: 0,
        lastAddedSignature: null,
        lastRemovedSignature: null,
        observedAt: 0
      },
      pendingSignals: {
        mutationCount: 0,
        clickCount: 0,
        scheduledAt: 0
      },
      lastInteraction: null,
      filtersReady: false,
      filtersReadyAt: 0,
      filterWrapperCount: 0,
      mountedAt: 0,
      updatedAt: 0,
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});

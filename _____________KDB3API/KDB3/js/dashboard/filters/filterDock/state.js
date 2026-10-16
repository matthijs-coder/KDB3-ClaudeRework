define([], function () {
  "use strict";

  var ACTIONS = {
    MOUNT_SUCCEEDED: "filterDock/mountSucceeded",
    CLICK_OBSERVED: "filterDock/clickObserved",
    MUTATIONS_OBSERVED: "filterDock/mutationsObserved",
    POPUP_OBSERVED: "filterDock/popupObserved",
    FILTERS_READY_OBSERVED: "filterDock/filtersReadyObserved",
    FILTERS_READY_DIAGNOSTIC_OBSERVED: "filterDock/filtersReadyDiagnosticObserved",
    EVALUATION_SCHEDULED: "filterDock/evaluationScheduled",
    EVALUATION_FINISHED: "filterDock/evaluationFinished",
    ERROR: "filterDock/error",
    DESTROY: "filterDock/destroy",
    CLICK_ORIGINAL_BUTTON_REQUESTED: "filterDock/clickOriginalButtonRequested",
    CLOSE_ACTIVE_POPUP_REQUESTED: "filterDock/closeActivePopupRequested"
  };

  function createInitialFilterDockState() {
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

  function copySlice(slice) {
    return slice ? Object.assign({}, slice) : slice;
  }

  function copyState(state, patch) {
    return Object.assign({}, state, patch, {
      popup: patch.popup ? Object.assign({}, state.popup, patch.popup) : copySlice(state.popup),
      observedChildren: patch.observedChildren
        ? Object.assign({}, state.observedChildren, patch.observedChildren)
        : copySlice(state.observedChildren),
      pendingSignals: patch.pendingSignals
        ? Object.assign({}, state.pendingSignals, patch.pendingSignals)
        : copySlice(state.pendingSignals)
    });
  }

  function reduceFilterDockState(state, action) {
    var currentState = state || createInitialFilterDockState();
    var currentAction = action || {};
    var payload = currentAction.payload || {};

    if (currentAction.type === ACTIONS.MOUNT_SUCCEEDED) {
      return copyState(currentState, {
        lifecycle: "ready",
        mountedAt: payload.mountedAt || Date.now(),
        updatedAt: Date.now(),
        errorCode: null,
        errorMessage: null
      });
    }
    if (currentAction.type === ACTIONS.CLICK_OBSERVED) {
      var clickPatch = {
        lastClickedFilter: payload.lastClickedFilter || null,
        lastInteraction: payload.interaction || null,
        updatedAt: Date.now(),
        pendingSignals: Object.assign({}, currentState.pendingSignals, {
          clickCount: (currentState.pendingSignals.clickCount || 0) + 1
        })
      };
      if (payload.popup) {
        clickPatch.popup = Object.assign({}, currentState.popup, payload.popup);
      }
      return copyState(currentState, clickPatch);
    }
    if (currentAction.type === ACTIONS.MUTATIONS_OBSERVED) {
      return copyState(currentState, {
        observedChildren: Object.assign({}, currentState.observedChildren, payload.observedChildren || {}),
        updatedAt: Date.now(),
        pendingSignals: Object.assign({}, currentState.pendingSignals, {
          mutationCount: (currentState.pendingSignals.mutationCount || 0) + (payload.mutationDelta || 1)
        })
      });
    }
    if (currentAction.type === ACTIONS.POPUP_OBSERVED) {
      return copyState(currentState, {
        popup: Object.assign({}, currentState.popup, payload.popup || {}),
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === ACTIONS.FILTERS_READY_OBSERVED) {
      if (currentState.filtersReady === true) {
        return currentState;
      }
      return copyState(currentState, {
        filtersReady: true,
        filtersReadyAt: payload.filtersReadyAt || Date.now(),
        filterWrapperCount: payload.filterWrapperCount || 0,
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === ACTIONS.FILTERS_READY_DIAGNOSTIC_OBSERVED) {
      return copyState(currentState, {
        errorCode: payload.errorCode || "FILTER_DOCK_OWNER_ROUTE_DIAGNOSTIC",
        errorMessage: payload.errorMessage || null,
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === ACTIONS.EVALUATION_SCHEDULED) {
      return copyState(currentState, {
        pendingSignals: Object.assign({}, currentState.pendingSignals, {
          scheduledAt: payload.scheduledAt || Date.now()
        })
      });
    }
    if (currentAction.type === ACTIONS.EVALUATION_FINISHED) {
      return copyState(currentState, {
        pendingSignals: Object.assign({}, currentState.pendingSignals, {
          mutationCount: 0,
          scheduledAt: 0
        }),
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === ACTIONS.ERROR) {
      return copyState(currentState, {
        lifecycle: "error",
        errorCode: payload.errorCode || "FILTER_DOCK_ERROR",
        errorMessage: payload.errorMessage || null,
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === ACTIONS.DESTROY) {
      return copyState(currentState, {
        lifecycle: "disposed",
        pendingSignals: {
          mutationCount: 0,
          clickCount: currentState.pendingSignals.clickCount || 0,
          scheduledAt: 0
        },
        updatedAt: Date.now()
      });
    }
    return currentState;
  }

  return {
    ACTIONS: ACTIONS,
    createInitialFilterDockState: createInitialFilterDockState,
    reduceFilterDockState: reduceFilterDockState
  };
});

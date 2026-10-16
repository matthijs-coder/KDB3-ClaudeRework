define(["../config/actions.js", "./initialState.js"], function (_actions, _initialState) {
  "use strict";

  function createFilterDockReducer() {
    return reduceFilterDockState;
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
    var currentState = state || _initialState();
    var currentAction = action || {};
    var payload = currentAction.payload || {};

    if (currentAction.type === _actions.MOUNT_SUCCEEDED) {
      return copyState(currentState, {
        lifecycle: "ready",
        mountedAt: payload.mountedAt || Date.now(),
        updatedAt: Date.now(),
        errorCode: null,
        errorMessage: null
      });
    }
    if (currentAction.type === _actions.CLICK_OBSERVED) {
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
    if (currentAction.type === _actions.MUTATIONS_OBSERVED) {
      return copyState(currentState, {
        observedChildren: Object.assign({}, currentState.observedChildren, payload.observedChildren || {}),
        updatedAt: Date.now(),
        pendingSignals: Object.assign({}, currentState.pendingSignals, {
          mutationCount: (currentState.pendingSignals.mutationCount || 0) + (payload.mutationDelta || 1)
        })
      });
    }
    if (currentAction.type === _actions.POPUP_OBSERVED) {
      return copyState(currentState, {
        popup: Object.assign({}, currentState.popup, payload.popup || {}),
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === _actions.FILTERS_READY_OBSERVED) {
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
    if (currentAction.type === _actions.FILTERS_READY_DIAGNOSTIC_OBSERVED) {
      return copyState(currentState, {
        errorCode: payload.errorCode || "FILTER_DOCK_OWNER_ROUTE_DIAGNOSTIC",
        errorMessage: payload.errorMessage || null,
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === _actions.EVALUATION_SCHEDULED) {
      return copyState(currentState, {
        pendingSignals: Object.assign({}, currentState.pendingSignals, {
          scheduledAt: payload.scheduledAt || Date.now()
        })
      });
    }
    if (currentAction.type === _actions.EVALUATION_FINISHED) {
      return copyState(currentState, {
        pendingSignals: Object.assign({}, currentState.pendingSignals, {
          mutationCount: 0,
          scheduledAt: 0
        }),
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === _actions.ERROR) {
      return copyState(currentState, {
        lifecycle: "error",
        errorCode: payload.errorCode || "FILTER_DOCK_ERROR",
        errorMessage: payload.errorMessage || null,
        updatedAt: Date.now()
      });
    }
    if (currentAction.type === _actions.DESTROY) {
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

  return createFilterDockReducer;
});

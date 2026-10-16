define([
  "../config/actions.js",
  "./initialState.js"
], function (_actions, _initialState) {
  "use strict";

  function createSichtReducer() {
    return function reducer(_state, _action) {
      var state = _state || _initialState();
      var action = _action || {};
      var payload = action.payload || {};

      if (action.type === _actions.MOUNT_SUCCEEDED) {
        return Object.assign({}, state, {
          lifecycle: "ready",
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.SYNC_OPTIONS_EVALUATED) {
        return Object.assign({}, state, {
          byOption: Object.assign({}, state.byOption, payload.byOption || {}),
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.SINGLE_SELECT_INVENTORY_RECONCILED) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            lastInventoryGeneration: payload.inventoryGeneration != null
              ? payload.inventoryGeneration
              : payload.generation,
            lastInventorySource: payload.source || null,
            lastInventoryAt: payload.timestamp
          })
        });
      }
      if (action.type === _actions.STARTUP_DEFAULT_IN_PROGRESS) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            startupDefaultInProgress: true
          })
        });
      }
      if (action.type === _actions.STARTUP_DEFAULT_FAILED) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            startupDefaultInProgress: false
          }),
          errorCode: payload.errorCode || "SICHT_STARTUP_DEFAULT_FAILED",
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : ""
        });
      }
      if (
        action.type === _actions.FILTER_DOCK_STATE_CHANGED ||
        action.type === _actions.FILTER_DOCK_POPUP_READY
      ) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            lastHandoffAt: payload.timestamp != null ? payload.timestamp : state.meta.lastHandoffAt
          })
        });
      }
      if (action.type === _actions.SINGLE_SELECT_COMMITTED) {
        var selection = payload.selection || {};
        var nextMeta = Object.assign({}, state.meta, {
          lastCommittedAt: payload.timestamp != null ? payload.timestamp : state.meta.lastCommittedAt
        });
        if (payload.isStartupDefault === true) {
          nextMeta.startupDefaultCommitted = true;
          nextMeta.startupDefaultInProgress = false;
        }
        if (payload.isParameterClear === true) {
          nextMeta.startupDefaultCommitted = false;
          nextMeta.startupDefaultInProgress = false;
        }
        return Object.assign({}, state, {
          lifecycle: "ready",
          activeFilterInstanceId: payload.filterInstanceId != null
            ? String(payload.filterInstanceId)
            : state.activeFilterInstanceId,
          currentSelection: {
            displayValue: selection.displayValue != null ? String(selection.displayValue) : "",
            useValue: selection.useValue != null ? String(selection.useValue) : "",
            displaySource: selection.displaySource != null
              ? String(selection.displaySource) : "unknown"
          },
          backupSelection: {
            displayValue: selection.displayValue != null ? String(selection.displayValue) : "",
            useValue: selection.useValue != null ? String(selection.useValue) : "",
            displaySource: selection.displaySource != null
              ? String(selection.displaySource) : "unknown"
          },
          pendingSelection: {
            displayValue: selection.displayValue != null ? String(selection.displayValue) : ""
          },
          activeSichtValue: selection.displayValue
            ? String(selection.displayValue) : null,
          meta: nextMeta,
          lastHistoryStep: payload.historyStep || null,
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.HISTORY_STEP_FINALIZED) {
        return Object.assign({}, state, {
          lastHistoryStep: payload.historyStep || null
        });
      }
      if (
        action.type === _actions.SINGLE_SELECT_DRAFT_CHANGED ||
        action.type === _actions.SINGLE_SELECT_DRAFT_REVERTED
      ) {
        var pendingSelection = payload.pendingSelection || {};
        return Object.assign({}, state, {
          pendingSelection: {
            displayValue: pendingSelection.displayValue != null
              ? String(pendingSelection.displayValue)
              : (payload.pendingDisplayValue || "")
          }
        });
      }
      if (action.type === _actions.ERROR) {
        return Object.assign({}, state, {
          lifecycle: "error",
          errorCode: payload.errorCode || "SICHT_ERROR",
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : ""
        });
      }
      if (action.type === _actions.DESTROY) {
        return Object.assign({}, state, {
          lifecycle: "disposed",
          pendingSelection: { displayValue: "" },
          meta: Object.assign({}, state.meta, {
            lastHandoffAt: null
          })
        });
      }
      return state;
    };
  }

  return createSichtReducer;
});

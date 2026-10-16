define(["./config.js"], function (_config) {
  "use strict";

  var actions = {
    MOUNT_SUCCEEDED: "sicht/mountSucceeded",
    FILTER_DOCK_STATE_CHANGED: "sicht/filterDockStateChanged",
    FILTER_DOCK_POPUP_READY: "sicht/filterDockPopupReady",
    SINGLE_SELECT_COMMITTED: "sicht/singleSelectCommitted",
    SINGLE_SELECT_DRAFT_CHANGED: "sicht/singleSelectDraftChanged",
    SINGLE_SELECT_DRAFT_REVERTED: "sicht/singleSelectDraftReverted",
    SINGLE_SELECT_INVENTORY_RECONCILED: "sicht/singleSelectInventoryReconciled",
    HISTORY_STEP_FINALIZED: "sicht/historyStepFinalized",
    PARAMETER_SET_CLEAR_REQUESTED: "sicht/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "sicht/parameterSetRestoreRequested",
    PARAMETER_SET_DOWNSTREAM_VISIBILITY_REQUESTED: "sicht/parameterSetDownstreamVisibilityRequested",
    TABLE_DATA_CHANGED: "sicht/tableDataChanged",
    SYNC_REQUESTED: "sicht/syncRequested",
    SYNC_OPTIONS_EVALUATED: "sicht/syncOptionsEvaluated",
    STARTUP_DEFAULT_IN_PROGRESS: "sicht/startupDefaultInProgress",
    STARTUP_DEFAULT_FAILED: "sicht/startupDefaultFailed",
    ERROR: "sicht/error",
    DESTROY: "sicht/destroy"
  };

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

  function createInitialState() {
    var byOption = {};
    _config.VARIANT_KEYS.forEach(function (_key) {
      byOption[_key] = createOptionState(_config.SICHT_VARIANTS[_key]);
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

  function createSichtReducer() {
    return function reducer(_state, _action) {
      var state = _state || createInitialState();
      var action = _action || {};
      var payload = action.payload || {};

      if (action.type === actions.MOUNT_SUCCEEDED) {
        return Object.assign({}, state, {
          lifecycle: "ready",
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === actions.SYNC_OPTIONS_EVALUATED) {
        return Object.assign({}, state, {
          byOption: Object.assign({}, state.byOption, payload.byOption || {}),
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === actions.SINGLE_SELECT_INVENTORY_RECONCILED) {
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
      if (action.type === actions.STARTUP_DEFAULT_IN_PROGRESS) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            startupDefaultInProgress: true
          })
        });
      }
      if (action.type === actions.STARTUP_DEFAULT_FAILED) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            startupDefaultInProgress: false
          }),
          errorCode: payload.errorCode || "SICHT_STARTUP_DEFAULT_FAILED",
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : ""
        });
      }
      if (
        action.type === actions.FILTER_DOCK_STATE_CHANGED ||
        action.type === actions.FILTER_DOCK_POPUP_READY
      ) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            lastHandoffAt: payload.timestamp != null ? payload.timestamp : state.meta.lastHandoffAt
          })
        });
      }
      if (action.type === actions.SINGLE_SELECT_COMMITTED) {
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
      if (action.type === actions.HISTORY_STEP_FINALIZED) {
        return Object.assign({}, state, {
          lastHistoryStep: payload.historyStep || null
        });
      }
      if (
        action.type === actions.SINGLE_SELECT_DRAFT_CHANGED ||
        action.type === actions.SINGLE_SELECT_DRAFT_REVERTED
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
      if (action.type === actions.ERROR) {
        return Object.assign({}, state, {
          lifecycle: "error",
          errorCode: payload.errorCode || "SICHT_ERROR",
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : ""
        });
      }
      if (action.type === actions.DESTROY) {
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

  return {
    actions: actions,
    createInitialState: createInitialState,
    createSichtReducer: createSichtReducer
  };
});

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

  function withMeta(_state, _metaPatch) {
    return Object.assign({}, _state, { meta: Object.assign({}, _state.meta, _metaPatch) });
  }

  function readErrorMessage(_payload) {
    return _payload.errorMessage != null ? String(_payload.errorMessage) : "";
  }

  function reduceInventoryReconciled(_state, _payload) {
    return withMeta(_state, {
      lastInventoryGeneration: _payload.inventoryGeneration != null
        ? _payload.inventoryGeneration
        : _payload.generation,
      lastInventorySource: _payload.source || null,
      lastInventoryAt: _payload.timestamp
    });
  }

  function reduceStartupDefaultFailed(_state, _payload) {
    return Object.assign({}, withMeta(_state, { startupDefaultInProgress: false }), {
      errorCode: _payload.errorCode || "SICHT_STARTUP_DEFAULT_FAILED",
      errorMessage: readErrorMessage(_payload)
    });
  }

  function reduceDockHandoff(_state, _payload) {
    return withMeta(_state, {
      lastHandoffAt: _payload.timestamp != null ? _payload.timestamp : _state.meta.lastHandoffAt
    });
  }

  function readConfirmedSelection(_selection) {
    return {
      displayValue: _selection.displayValue != null ? String(_selection.displayValue) : "",
      useValue: _selection.useValue != null ? String(_selection.useValue) : "",
      displaySource: _selection.displaySource != null ? String(_selection.displaySource) : "unknown"
    };
  }

  function readCommittedMeta(_state, _payload) {
    var nextMeta = Object.assign({}, _state.meta, {
      lastCommittedAt: _payload.timestamp != null ? _payload.timestamp : _state.meta.lastCommittedAt
    });
    if (_payload.isStartupDefault === true) {
      nextMeta.startupDefaultCommitted = true;
      nextMeta.startupDefaultInProgress = false;
    }
    if (_payload.isParameterClear === true) {
      nextMeta.startupDefaultCommitted = false;
      nextMeta.startupDefaultInProgress = false;
    }
    return nextMeta;
  }

  function reduceCommitted(_state, _payload) {
    var selection = _payload.selection || {};
    var nextMeta = readCommittedMeta(_state, _payload);
    return Object.assign({}, _state, {
      lifecycle: "ready",
      activeFilterInstanceId: _payload.filterInstanceId != null
        ? String(_payload.filterInstanceId)
        : _state.activeFilterInstanceId,
      currentSelection: readConfirmedSelection(selection),
      backupSelection: readConfirmedSelection(selection),
      pendingSelection: {
        displayValue: selection.displayValue != null ? String(selection.displayValue) : ""
      },
      activeSichtValue: selection.displayValue
        ? String(selection.displayValue) : null,
      meta: nextMeta,
      lastHistoryStep: _payload.historyStep || null,
      errorCode: null,
      errorMessage: null
    });
  }

  function reduceDraft(_state, _payload) {
    var pendingSelection = _payload.pendingSelection || {};
    return Object.assign({}, _state, {
      pendingSelection: {
        displayValue: pendingSelection.displayValue != null
          ? String(pendingSelection.displayValue)
          : (_payload.pendingDisplayValue || "")
      }
    });
  }

  function reduceError(_state, _payload) {
    return Object.assign({}, _state, {
      lifecycle: "error",
      errorCode: _payload.errorCode || "SICHT_ERROR",
      errorMessage: readErrorMessage(_payload)
    });
  }

  function reduceDestroy(_state) {
    return Object.assign({}, withMeta(_state, { lastHandoffAt: null }), {
      lifecycle: "disposed",
      pendingSelection: { displayValue: "" }
    });
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
        return reduceInventoryReconciled(state, payload);
      }
      if (action.type === actions.STARTUP_DEFAULT_IN_PROGRESS) {
        return withMeta(state, { startupDefaultInProgress: true });
      }
      if (action.type === actions.STARTUP_DEFAULT_FAILED) {
        return reduceStartupDefaultFailed(state, payload);
      }
      if (
        action.type === actions.FILTER_DOCK_STATE_CHANGED ||
        action.type === actions.FILTER_DOCK_POPUP_READY
      ) {
        return reduceDockHandoff(state, payload);
      }
      if (action.type === actions.SINGLE_SELECT_COMMITTED) {
        return reduceCommitted(state, payload);
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
        return reduceDraft(state, payload);
      }
      if (action.type === actions.ERROR) {
        return reduceError(state, payload);
      }
      if (action.type === actions.DESTROY) {
        return reduceDestroy(state);
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

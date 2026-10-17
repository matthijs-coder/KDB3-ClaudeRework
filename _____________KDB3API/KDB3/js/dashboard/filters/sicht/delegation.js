define([
  "./config.js",
  "./state.js",
  "./state/selectors.js",
  "./view.js",
  "./availability.js",
  "./operations.js",
  "../singleSelect/selectors.js",
  "../singleSelect/config.js",
  "../_core/dockHandoff.js"
], function (_config, _state, _selectors, _view, _availability, _operations, _singleSelectSelectors, _singleSelectConfig, _dockHandoff) {
  "use strict";

  var actions = _state.actions;

  // ---- filterDock handoff: evaluate options, sync the popup, delegate to singleSelect ----

  function applyFilterDockHandoff(_KDB, _dispatchInternal, _payload, _actionType) {
    try {
      var mappedHandoff = mapFilterDockHandoff(_payload);
      var byOption;
      if (!mappedHandoff) {
        return false;
      }
      _dispatchInternal({
        type: _actionType,
        payload: { timestamp: mappedHandoff.timestamp }
      });
      byOption = _availability.evaluateAndStoreSichtOptions(_KDB, _dispatchInternal);
      if (shouldSyncPopupAvailability(_actionType, mappedHandoff)) {
        _view.syncSichtOptionAvailability(_KDB, mappedHandoff, byOption);
      }
      return delegateToSingleSelect(
        _KDB,
        mappedHandoff,
        _actionType,
        byOption,
        _operations.buildSichtOperationId("handoff")
      );
    } catch (error) {
      console.error("[sicht.applyFilterDockHandoff] failed", error);
      return false;
    }
  }

  function shouldSyncPopupAvailability(_actionType, _mappedHandoff) {
    if (_actionType === actions.FILTER_DOCK_POPUP_READY) {
      return true;
    }
    return !!(_mappedHandoff.popup && _mappedHandoff.popup.isVisible === true);
  }

  var HANDOFF_PROFILE = {
    filterType: "sicht",
    labelDefault: "",
    scopeMode: "scopeTypeOnly",
    keyScope: "scopeType",
    timestamp: "timestampFirst",
    fields: [
      ["filterId", "orNull"],
      ["filterKey", "derived"],
      ["filterInstanceId", "orNull"],
      ["filterLabel", "derived"],
      ["filterScope", "derived"],
      ["filterType", "filterType"],
      ["scopeType", "derived"],
      ["tabId", "nonNull"],
      ["scopeId", "scopeIdGlobalDefault"],
      ["scopeResolution", function (_raw, _derived) {
        return _raw.scopeResolution || (_derived.scopeType === "global" ? "global" : "ownerRequired");
      }],
      ["itemIdHint", "nonNull"],
      ["itemNameHint", function (_raw, _derived) { return _raw.itemNameHint || _derived.filterLabel; }],
      ["semanticInstanceKeyHint", "nonNull"],
      ["filterConfig", "refOrEmpty"],
      ["interactionType", "derived"],
      ["optionLabel", "optionLabel"],
      ["isAlleOption", "isTrue"],
      ["popup", function (_raw) { return readSerializablePopup(_raw.popup); }],
      ["capabilities", "derived"],
      ["timestamp", "derived"]
    ]
  };

  function mapFilterDockHandoff(_handoff) {
    return _dockHandoff.mapDockHandoff(_handoff, HANDOFF_PROFILE);
  }

  function readSerializablePopup(_popup) {
    if (!_popup || typeof _popup !== "object") {
      return null;
    }
    return {
      isVisible: _popup.isVisible === true,
      hasOptions: _popup.hasOptions === true,
      optionCount: _popup.optionCount || 0,
      hasOkButton: _popup.hasOkButton === true,
      hasCancelButton: _popup.hasCancelButton === true,
      observedAt: _popup.observedAt || null
    };
  }

  function delegateToSingleSelect(_KDB, _mappedHandoff, _actionType, _byOption, _operationId) {
    try {
      var api = _KDB && _KDB.api ? _KDB.api.singleSelect : null;
      var dispatchType;
      var result;
      if (!api || !_mappedHandoff) {
        return false;
      }
      dispatchType =
        _actionType === actions.FILTER_DOCK_POPUP_READY
          ? _singleSelectConfig.actions.FILTER_DOCK_POPUP_READY
          : _singleSelectConfig.actions.FILTER_DOCK_STATE_CHANGED;
      result = api.dispatch({
        type: dispatchType,
        payload: buildDelegatedPayload(
          _mappedHandoff,
          _byOption,
          readConfirmedInitialSelection(_KDB),
          _operationId,
          buildOwnerSelectionContext(_KDB)
        )
      });
      if (result && typeof result.catch === "function") {
        result.catch(function (_error) {
          console.error("[sicht.delegateToSingleSelect] async dispatch failed", _error);
        });
      }
      return true;
    } catch (error) {
      console.error("[sicht.delegateToSingleSelect] failed", error);
      return false;
    }
  }

  function buildDelegatedPayload(_mappedHandoff, _byOption, _initialSelection, _operationId, _ownerSelectionContext) {
    var filterConfig = Object.assign({}, _mappedHandoff.filterConfig || {}, {
      selectionValuesByDisplay: buildSelectionValuesByDisplay(_byOption)
    });
    if (_initialSelection) {
      filterConfig.initialSelection = _initialSelection;
    }
    return Object.assign({}, _mappedHandoff, {
      filterType: "sicht",
      authorizedByOwner: "sicht",
      operationId: _operationId,
      filterConfig: filterConfig,
      ownerSelectionContext: _ownerSelectionContext,
      capabilities: Object.assign({}, _mappedHandoff.capabilities || {}, {
        hasAlleOption: false
      })
    });
  }

  function buildSelectionValuesByDisplay(_byOption) {
    var map = {};
    var keys;
    var idx;
    var optionKey;
    var optionState;
    var displayValue;
    var useValue;
    if (!_byOption || typeof _byOption !== "object") {
      return map;
    }
    keys = Object.keys(_byOption);
    for (idx = 0; idx < keys.length; idx += 1) {
      optionKey = keys[idx];
      optionState = _byOption[optionKey];
      if (!optionState || typeof optionState !== "object") {
        continue;
      }
      displayValue = optionState.displayValue != null ? String(optionState.displayValue).trim() : "";
      useValue = optionState.useValue != null ? String(optionState.useValue).trim() : "";
      if (displayValue && useValue) {
        map[displayValue] = { d: displayValue, u: useValue };
      }
    }
    return map;
  }

  function readConfirmedInitialSelection(_KDB) {
    var sichtState = _selectors.readSichtState(_KDB);
    var selection;
    var displayValue;
    if (!sichtState || !sichtState.currentSelection) {
      return null;
    }
    selection = sichtState.currentSelection;
    displayValue =
      selection.displayValue != null ? String(selection.displayValue).trim() : "";
    if (!displayValue || displayValue.toLowerCase() === _config.ALLE_LABEL.toLowerCase()) {
      return null;
    }
    return {
      displayValue: displayValue,
      useValue: selection.useValue != null ? String(selection.useValue) : ""
    };
  }

  // Call-local snapshot of Sicht's own state; singleSelect uses it within this
  // delegated call and never persists it.
  function buildOwnerSelectionContext(_KDB) {
    var state = _selectors.readSichtState(_KDB);
    if (!state) {
      return null;
    }
    return {
      currentSelection: {
        displayValue: state.currentSelection ? state.currentSelection.displayValue : "",
        useValue: state.currentSelection ? state.currentSelection.useValue : "",
        displaySource: state.currentSelection
          ? state.currentSelection.displaySource : "unavailable"
      },
      backupSelection: {
        displayValue: state.backupSelection ? state.backupSelection.displayValue : "",
        useValue: state.backupSelection ? state.backupSelection.useValue : "",
        displaySource: state.backupSelection
          ? state.backupSelection.displaySource : "unavailable"
      },
      pendingSelection: {
        displayValue: state.pendingSelection ? state.pendingSelection.displayValue : ""
      }
    };
  }

  // ---- owner selection: sicht never writes Cognos or singleSelect state directly ----

  async function dispatchSingleSelectOwnerSelection(_KDB, _payload) {
    var dispatch = readSingleSelectDispatch(_KDB);
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.sicht : null;
    var operationId = _payload && _payload.operationId;
    if (!dispatch) {
      return {
        ok: false,
        degraded: false,
        applied: [],
        diagnostics: [{
          code: "SICHT_SINGLE_SELECT_API_MISSING",
          message: "singleSelect dispatch API unavailable"
        }]
      };
    }
    if (!runtime || !_operations.registerOperation(runtime, _payload)) {
      return {
        ok: false,
        degraded: false,
        applied: [],
        diagnostics: [{
          code: "SICHT_COMMIT_STALE",
          message: "delegated operationId is missing or already registered"
        }]
      };
    }
    try {
      var result = await dispatch({
        type: _singleSelectConfig.actions.APPLY_OWNER_SELECTION,
        payload: Object.assign({ notifyOwner: "sicht", skipHistory: true }, _payload)
      });
      if (!result || result.ok !== true) {
        _operations.abandonOperation(runtime, operationId);
      }
      return result;
    } catch (error) {
      _operations.abandonOperation(runtime, operationId);
      console.error("[sicht.dispatchSingleSelectOwnerSelection] failed", {
        filterInstanceId: _payload && _payload.filterInstanceId
      }, error);
      return {
        ok: false,
        degraded: false,
        applied: [],
        diagnostics: [{
          code: "SICHT_SINGLE_SELECT_DISPATCH_FAILED",
          message: String(error && error.message ? error.message : error)
        }]
      };
    }
  }

  function readSingleSelectDispatch(_KDB) {
    return _KDB && _KDB.api && _KDB.api.singleSelect ? _KDB.api.singleSelect.dispatch : null;
  }

  function readSingleSelectInventoryGeneration(_KDB) {
    return _singleSelectSelectors.readInventoryGeneration(_KDB);
  }

  function readLiveSichtInstances(_KDB) {
    return _singleSelectSelectors.readFilterInstances(_KDB, _config.LIVE_SICHT_QUERY).filter(function (_instance) {
      return _instance.filterType === "sicht" && _instance.selectionOwner === "sicht";
    });
  }

  function matchesIdentity(_record, _identity) {
    if (!_identity) {
      return true;
    }
    if (_identity.scopeType && _record.scopeType !== _identity.scopeType) {
      return false;
    }
    if (_identity.scopeId && String(_record.scopeId) !== String(_identity.scopeId)) {
      return false;
    }
    if (_identity.itemId != null && String(_record.itemId) !== String(_identity.itemId)) {
      return false;
    }
    if (_identity.semanticInstanceKey != null &&
      String(_record.semanticInstanceKey) !== String(_identity.semanticInstanceKey)) {
      return false;
    }
    return true;
  }

  // Startup/restore require one live global Sicht descriptor. History may add
  // an exact/stale identity tuple, which is verified before using that same
  // unique live descriptor; legacy values resolve only under uniqueness.
  function resolveDelegatedSichtInstanceId(_KDB, _identity) {
    var matches = readLiveSichtInstances(_KDB);
    if (matches.length !== 1) {
      return null;
    }
    if (!_identity || !_identity.filterInstanceId) {
      if (_identity && !matchesIdentity(matches[0], _identity)) {
        console.warn("[sicht.resolveDelegatedSichtInstanceId] legacy identity hint mismatch", {
          filterInstanceId: matches[0].filterInstanceId
        });
      }
      return matches[0].filterInstanceId;
    }
    if (!matchesIdentity(matches[0], _identity) ||
      matches[0].filterInstanceId !== _identity.filterInstanceId) {
      return null;
    }
    return matches[0].filterInstanceId;
  }

  return {
    applyFilterDockHandoff: applyFilterDockHandoff,
    mapFilterDockHandoff: mapFilterDockHandoff,
    dispatchSingleSelectOwnerSelection: dispatchSingleSelectOwnerSelection,
    readSingleSelectInventoryGeneration: readSingleSelectInventoryGeneration,
    readLiveSichtInstances: readLiveSichtInstances,
    resolveDelegatedSichtInstanceId: resolveDelegatedSichtInstanceId
  };
});

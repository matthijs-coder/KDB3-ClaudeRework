define([], function () {
  "use strict";

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
    var sichtState = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    var selection;
    var displayValue;
    if (!sichtState || !sichtState.currentSelection) {
      return null;
    }
    selection = sichtState.currentSelection;
    displayValue =
      selection.displayValue != null ? String(selection.displayValue).trim() : "";
    if (!displayValue || displayValue.toLowerCase() === "alle") {
      return null;
    }
    return {
      displayValue: displayValue,
      useValue: selection.useValue != null ? String(selection.useValue) : ""
    };
  }

  // Cloned, call-local snapshot of Sicht's own state (contract §4). singleSelect
  // uses it only within this delegated call and never persists it.
  function buildOwnerSelectionContext(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
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

  function delegateToSingleSelect(_KDB, _mappedHandoff, _actionType, _byOption, _operationId) {
    try {
      var api = _KDB && _KDB.api ? _KDB.api.singleSelect : null;
      var dispatchType;
      var result;
      if (!api || typeof api.dispatch !== "function" || !_mappedHandoff) {
        return false;
      }
      dispatchType =
        _actionType === "sicht/filterDockPopupReady"
          ? "singleSelect/filterDockPopupReady"
          : "singleSelect/filterDockStateChanged";
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

  return delegateToSingleSelect;
});

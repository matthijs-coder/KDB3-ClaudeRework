define([], function () {
  "use strict";

  function normalizeDisplayValue(_displayValue) {
    var displayValue = _displayValue == null ? "" : String(_displayValue).trim();
    return displayValue || "Alle";
  }

  function normalizeUseValue(_useValue, _displayValue) {
    var displayValue = normalizeDisplayValue(_displayValue);
    if (displayValue === "Alle") {
      return "";
    }
    return _useValue == null ? "" : String(_useValue).trim();
  }

  function createConfirmedSelection(_displayValue, _useValue) {
    var displayValue = normalizeDisplayValue(_displayValue);
    return {
      displayValue: displayValue,
      useValue: normalizeUseValue(_useValue, displayValue)
    };
  }

  function createPendingSelection(_displayValue) {
    return {
      displayValue: normalizeDisplayValue(_displayValue)
    };
  }

  function normalizeConfirmedSelection(_value) {
    if (_value && typeof _value === "object") {
      if (_value.displayValue === null) {
        return {
          displayValue: null,
          useValue: _value.useValue == null ? "" : String(_value.useValue),
          displaySource: _value.displaySource || "unavailable"
        };
      }
      return Object.assign(
        createConfirmedSelection(_value.displayValue, _value.useValue),
        _value.displaySource ? { displaySource: _value.displaySource } : {}
      );
    }
    return createConfirmedSelection(_value, "");
  }

  function normalizePendingSelection(_value) {
    if (_value && typeof _value === "object") {
      return createPendingSelection(_value.displayValue);
    }
    return createPendingSelection(_value);
  }

  function getConfirmedDisplayValue(_value) {
    return normalizeConfirmedSelection(_value).displayValue;
  }

  function getConfirmedUseValue(_value) {
    return normalizeConfirmedSelection(_value).useValue;
  }

  function getPendingDisplayValue(_value) {
    return normalizePendingSelection(_value).displayValue;
  }

  function applyConfirmedState(_filterState, _singleSelectRoot, _nextConfirmedSelection) {
    var nextDisplay = _nextConfirmedSelection.displayValue;
    var nextUse = _nextConfirmedSelection.useValue;
    var displaySource = _nextConfirmedSelection.displaySource || "cognos";
    var normalized = nextDisplay === null
      ? { displayValue: null, useValue: nextUse == null ? "" : String(nextUse), displaySource: displaySource }
      : Object.assign(createConfirmedSelection(nextDisplay, nextUse), { displaySource: displaySource });
    _filterState.currentSelection = normalized;
    _filterState.backupSelection = Object.assign({}, normalized);
    _filterState.pendingSelection = createPendingSelection(nextDisplay === null ? "Alle" : nextDisplay);
    _filterState.lastConfirmedTs = Date.now();
    if (_filterState.timestamps) { _filterState.timestamps.confirmedAt = _filterState.lastConfirmedTs; }
    _singleSelectRoot.lastConfirmedAt = _filterState.lastConfirmedTs;
  }

  function revertFilterState(_filterState, _previous) {
    var previous = normalizeConfirmedSelection(_previous);
    _filterState.currentSelection = Object.assign({}, previous);
    _filterState.backupSelection = Object.assign({}, previous);
    _filterState.pendingSelection = createPendingSelection(
      previous.displayValue === null ? "Alle" : previous.displayValue
    );
  }

  return {
    createConfirmedSelection: createConfirmedSelection,
    createPendingSelection: createPendingSelection,
    normalizeConfirmedSelection: normalizeConfirmedSelection,
    normalizePendingSelection: normalizePendingSelection,
    getConfirmedDisplayValue: getConfirmedDisplayValue,
    getConfirmedUseValue: getConfirmedUseValue,
    getPendingDisplayValue: getPendingDisplayValue,
    applyConfirmedState: applyConfirmedState,
    revertFilterState: revertFilterState
  };
});

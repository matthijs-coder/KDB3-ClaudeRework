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

  return {
    createConfirmedSelection: createConfirmedSelection,
    createPendingSelection: createPendingSelection,
    normalizeConfirmedSelection: normalizeConfirmedSelection,
    normalizePendingSelection: normalizePendingSelection,
    getConfirmedDisplayValue: getConfirmedDisplayValue,
    getConfirmedUseValue: getConfirmedUseValue,
    getPendingDisplayValue: getPendingDisplayValue
  };
});

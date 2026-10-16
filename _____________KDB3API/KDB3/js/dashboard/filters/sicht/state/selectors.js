define([], function () {
  "use strict";

  // Selector results are the stored objects; callers must not mutate them.
  function readSichtState(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    return state || undefined;
  }

  function readActiveSichtValue(_KDB) {
    var state = readSichtState(_KDB);
    if (!state) {
      return null;
    }
    if (state.activeSichtValue != null && String(state.activeSichtValue).trim() !== "") {
      return String(state.activeSichtValue);
    }
    return (state.currentSelection && state.currentSelection.displayValue)
      ? String(state.currentSelection.displayValue)
      : null;
  }

  function readConfirmedSichtSelection(_KDB) {
    var state = readSichtState(_KDB);
    if (!state || !state.currentSelection || !state.currentSelection.displayValue) {
      return null;
    }
    return {
      filterInstanceId: state.activeFilterInstanceId || null,
      displayValue: state.currentSelection.displayValue,
      useValue: state.currentSelection.useValue != null ? state.currentSelection.useValue : "",
      displaySource: state.currentSelection.displaySource || "unknown"
    };
  }

  function findOptionByDisplay(_byOption, _displayValue) {
    var keys = Object.keys(_byOption || {});
    var idx;
    var option;
    for (idx = 0; idx < keys.length; idx += 1) {
      option = _byOption[keys[idx]];
      if (option && option.displayValue === _displayValue) {
        return option;
      }
    }
    return null;
  }

  function findOptionByUse(_byOption, _useValue) {
    var keys = Object.keys(_byOption || {});
    var idx;
    var option;
    for (idx = 0; idx < keys.length; idx += 1) {
      option = _byOption[keys[idx]];
      if (option && String(option.useValue || "") === _useValue) {
        return option;
      }
    }
    return null;
  }

  return {
    readSichtState: readSichtState,
    readActiveSichtValue: readActiveSichtValue,
    readConfirmedSichtSelection: readConfirmedSichtSelection,
    findOptionByDisplay: findOptionByDisplay,
    findOptionByUse: findOptionByUse
  };
});

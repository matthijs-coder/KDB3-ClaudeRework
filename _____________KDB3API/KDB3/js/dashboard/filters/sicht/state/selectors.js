define([], function () {
  "use strict";

  function cloneObject(_value) {
    if (_value == null || typeof _value !== "object") {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_error) {
      return Object.assign({}, _value);
    }
  }

  function readSichtState(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    return state ? cloneObject(state) : undefined;
  }

  function readActiveSichtValue(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    return state ? state.activeSichtValue : null;
  }

  function readSichtOptionState(_KDB, _sichtValue) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    var option = state && state.byOption ? state.byOption[_sichtValue] : null;
    return option ? cloneObject(option) : undefined;
  }

  function readCurrentSichtSelection(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    return state && state.currentSelection
      ? cloneObject(state.currentSelection)
      : undefined;
  }

  function readActiveSichtInstanceId(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    return state && state.activeFilterInstanceId ? state.activeFilterInstanceId : null;
  }

  function readConfirmedSichtSelection(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
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

  return {
    readSichtState: readSichtState,
    readActiveSichtValue: readActiveSichtValue,
    readSichtOptionState: readSichtOptionState,
    readCurrentSichtSelection: readCurrentSichtSelection,
    readActiveSichtInstanceId: readActiveSichtInstanceId,
    readConfirmedSichtSelection: readConfirmedSichtSelection
  };
});

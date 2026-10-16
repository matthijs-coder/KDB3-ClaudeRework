define([], function () {
  "use strict";

  function readOwnerState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.filterDock : undefined;
  }

  function readFilterDockState(_KDB) {
    var state = readOwnerState(_KDB);
    if (!state) {
      return undefined;
    }
    return Object.assign({}, state, {
      popup: state.popup ? Object.assign({}, state.popup) : state.popup,
      observedChildren: state.observedChildren ? Object.assign({}, state.observedChildren) : state.observedChildren,
      pendingSignals: state.pendingSignals ? Object.assign({}, state.pendingSignals) : state.pendingSignals,
      lastClickedFilter: state.lastClickedFilter ? Object.assign({}, state.lastClickedFilter) : state.lastClickedFilter,
      lastInteraction: state.lastInteraction ? Object.assign({}, state.lastInteraction) : state.lastInteraction
    });
  }

  function readLastClickedFilter(_KDB) {
    var state = readOwnerState(_KDB);
    return state && state.lastClickedFilter ? Object.assign({}, state.lastClickedFilter) : null;
  }

  function readPopupState(_KDB) {
    var state = readOwnerState(_KDB);
    return state && state.popup ? Object.assign({}, state.popup) : null;
  }

  function readObservedChildren(_KDB) {
    var state = readOwnerState(_KDB);
    return state && state.observedChildren ? Object.assign({}, state.observedChildren) : null;
  }

  function readLastInteraction(_KDB) {
    var state = readOwnerState(_KDB);
    return state && state.lastInteraction ? Object.assign({}, state.lastInteraction) : null;
  }

  return {
    readFilterDockState: readFilterDockState,
    readLastClickedFilter: readLastClickedFilter,
    readPopupState: readPopupState,
    readObservedChildren: readObservedChildren,
    readLastInteraction: readLastInteraction
  };
});

define([], function () {
  "use strict";

  function readOwnerState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.filterDock : null;
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
    return state ? state.lastClickedFilter : null;
  }

  function readLastInteraction(_KDB) {
    var state = readOwnerState(_KDB);
    return state ? state.lastInteraction : null;
  }

  function readPopupState(_KDB) {
    var state = readOwnerState(_KDB);
    return state ? state.popup : null;
  }

  function readFiltersReadyFlag(_KDB) {
    var state = readOwnerState(_KDB);
    return !!(state && state.filtersReady);
  }

  function readActiveFilterEl(_KDB) {
    var runtime = readDockRuntime(_KDB);
    return runtime && runtime.domRefs && runtime.domRefs.activeFilterEl ? runtime.domRefs.activeFilterEl : null;
  }

  function readDockSelectors(_KDB) {
    return _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.filterDock : null;
  }

  function readDockRuntime(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.filterDock ? _KDB.runtime.filterDock : null;
  }

  return {
    readFilterDockState: readFilterDockState,
    readLastClickedFilter: readLastClickedFilter,
    readLastInteraction: readLastInteraction,
    readPopupState: readPopupState,
    readFiltersReadyFlag: readFiltersReadyFlag,
    readActiveFilterEl: readActiveFilterEl,
    readDockSelectors: readDockSelectors,
    readDockRuntime: readDockRuntime
  };
});

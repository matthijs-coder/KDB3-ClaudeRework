define([
  "../effects/dispatchFilterHandoff.js",
  "../effects/readFilterIdentity.js",
  "../effects/readPopupSnapshot.js",
  "../effects/resolveScopedPopupMount.js"
], function (
  _dispatchFilterHandoff,
  _readFilterIdentity,
  _readPopupSnapshot,
  _resolveScopedPopupMount
) {
  "use strict";

  function readLastClickedFilter(_KDB) {
    var filterDockState =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.filterDock : null;
    return filterDockState ? filterDockState.lastClickedFilter : null;
  }

  function readLastInteraction(_KDB) {
    var filterDockState =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.filterDock : null;
    return filterDockState ? filterDockState.lastInteraction : null;
  }

  function readActiveFilterType(_KDB) {
    var lastClickedFilter = readLastClickedFilter(_KDB);
    return lastClickedFilter && lastClickedFilter.filterType ? lastClickedFilter.filterType : null;
  }

  function readActiveFilterId(_KDB, _runtime, _selectors) {
    var lastClickedFilter = readLastClickedFilter(_KDB);
    if (_runtime.domRefs && _runtime.domRefs.activeFilterEl) {
      return _readFilterIdentity.buildFilterIdFromElement(
        _KDB,
        _runtime.domRefs.activeFilterEl,
        _selectors
      );
    }
    return lastClickedFilter && lastClickedFilter.filterId ? lastClickedFilter.filterId : null;
  }

  function readPopupScopeContext(_KDB, _runtime, _selectors, _lastClickedFilter) {
    if (!_lastClickedFilter) {
      return null;
    }
    return _resolveScopedPopupMount.buildScopeContext(_lastClickedFilter, _selectors, _runtime);
  }

  function ownerNeedsResync(_KDB) {
    return _dispatchFilterHandoff.ownerNeedsPopupDisplayResync(readActiveFilterType(_KDB));
  }

  function readPopupSnapshot(_KDB, _runtime, _selectors, _dockRoot, _scopeContext) {
    return _readPopupSnapshot(
      null,
      _dockRoot,
      _selectors,
      readActiveFilterId(_KDB, _runtime, _selectors),
      readActiveFilterType(_KDB),
      Date.now(),
      _runtime,
      _scopeContext
    );
  }

  return {
    readLastClickedFilter: readLastClickedFilter,
    readLastInteraction: readLastInteraction,
    readPopupScopeContext: readPopupScopeContext,
    ownerNeedsResync: ownerNeedsResync,
    readPopupSnapshot: readPopupSnapshot
  };
});

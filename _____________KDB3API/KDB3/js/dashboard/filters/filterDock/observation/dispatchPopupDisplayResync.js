define([
  "../effects/dispatchFilterHandoff.js",
  "../effects/readPopupSnapshot.js",
  "../effects/resolveScopedPopupMount.js",
  "../runtime/readDockRoot.js",
  "./buildPopupReadyHandoff.js"
], function (
  _dispatchFilterHandoff,
  _readPopupSnapshot,
  _resolveScopedPopupMount,
  _readDockRoot,
  _buildPopupReadyHandoff
) {
  "use strict";

  function readFilterDockSlice(_KDB, _key) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.filterDock : null;
    return state ? state[_key] : null;
  }

  function __controller(_KDB, _runtime, _options) {
    var lastClickedFilter;
    var lastInteraction;
    var selectors;
    var dockRoot;
    var scopeContext;
    var popup;
    var handoff;
    if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
      return false;
    }
    try {
      lastClickedFilter = readFilterDockSlice(_KDB, "lastClickedFilter");
      if (
        !lastClickedFilter ||
        !_dispatchFilterHandoff.ownerNeedsPopupDisplayResync(lastClickedFilter.filterType)
      ) {
        return false;
      }
      lastInteraction = readFilterDockSlice(_KDB, "lastInteraction");
      selectors = _KDB.elements.selectors.filterDock;
      dockRoot = _readDockRoot(_KDB);
      scopeContext = _resolveScopedPopupMount.buildScopeContext(
        lastClickedFilter,
        selectors,
        _runtime
      );
      if (!dockRoot || !selectors || !scopeContext) {
        return false;
      }
      popup = _readPopupSnapshot(
        null,
        dockRoot,
        selectors,
        lastClickedFilter.filterId,
        lastClickedFilter.filterType,
        Date.now(),
        _runtime,
        scopeContext
      );
      handoff = _buildPopupReadyHandoff(lastClickedFilter, lastInteraction, popup);
      if (!handoff || !handoff.filterKey || !String(handoff.filterKey).trim()) {
        return false;
      }
      handoff.resyncSource =
        _options && _options.resyncSource ? String(_options.resyncSource) : "mountMutation";
      handoff.observedAt = Date.now();
      return _dispatchFilterHandoff(_KDB, handoff, "popupReady") === true;
    } catch (error) {
      console.error("[filterDock.dispatchPopupDisplayResync] failed", error);
      return false;
    }
  }

  __controller.readFilterDockSlice = readFilterDockSlice;

  return __controller;
});

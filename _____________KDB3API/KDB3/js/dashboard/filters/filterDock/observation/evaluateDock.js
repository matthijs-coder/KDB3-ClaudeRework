define([
  "../state.js",
  "../identity.js",
  "../ownerRoutes.js",
  "../selectors.js",
  "../interaction/dockDom.js",
  "./filtersReady.js",
  "./ownerResync.js",
  "./popupDisplayResync.js",
  "./popupReadyHandoff.js",
  "./popupReadySession.js"
], function (
  _state,
  _identity,
  _ownerRoutes,
  _selectors,
  _dockDom,
  _filtersReady,
  _ownerResync,
  _popupDisplayResync,
  _popupReadyHandoff,
  _popupReadySession
) {
  "use strict";

  function readActiveFilterId(_KDB, runtime, selectors, lastClickedFilter) {
    if (runtime.domRefs && runtime.domRefs.activeFilterEl) {
      return _identity.buildFilterIdFromElement(_KDB, runtime.domRefs.activeFilterEl, selectors);
    }
    return lastClickedFilter && lastClickedFilter.filterId ? lastClickedFilter.filterId : null;
  }

  function stopTrackingPopup(runtime) {
    _popupDisplayResync.detachPopupDisplayResync(runtime);
    _popupReadySession.resetPopupReadyState(runtime);
  }

  // Step order matters: header, committed display, filters-ready, popup snapshot, then the popup flow.
  function evaluateDockState(ctx, mutationSummary) {
    var _KDB = ctx._KDB;
    var runtime = ctx.runtime;
    var selectors = _selectors.readDockSelectors(_KDB);
    var dockRoot = _dockDom.readDockRoot(_KDB);
    var summary = mutationSummary || null;
    var lastClickedFilter;
    var lastInteraction;
    var activeFilterType;
    var scopeContext;
    var popup;
    var needsResync;
    var hasNoOptions;
    if (!dockRoot) {
      return false;
    }
    _ownerResync.evaluateHeaderResync(_KDB, summary, dockRoot, selectors);
    _ownerResync.evaluateCommittedDisplayResync(_KDB, summary, dockRoot, selectors);
    _filtersReady.detectFiltersReady(ctx, dockRoot);
    lastClickedFilter = _selectors.readLastClickedFilter(_KDB);
    lastInteraction = _selectors.readLastInteraction(_KDB);
    activeFilterType = lastClickedFilter && lastClickedFilter.filterType ? lastClickedFilter.filterType : null;
    scopeContext = lastClickedFilter ? _dockDom.buildScopeContext(lastClickedFilter, selectors, runtime) : null;
    popup = _dockDom.readPopupSnapshot(
      null,
      dockRoot,
      selectors,
      readActiveFilterId(_KDB, runtime, selectors, lastClickedFilter),
      activeFilterType,
      Date.now(),
      runtime,
      scopeContext
    );
    ctx.dispatch({ type: _state.ACTIONS.POPUP_OBSERVED, payload: { popup: popup } });
    needsResync = _ownerRoutes.ownerNeedsPopupDisplayResync(activeFilterType);
    hasNoOptions = !popup.hasOptions || popup.optionCount < 1;
    if (!popup.isVisible || (!needsResync && hasNoOptions)) {
      stopTrackingPopup(runtime);
      return true;
    }
    if (needsResync && hasNoOptions) {
      return true;
    }
    if (!needsResync) {
      _popupDisplayResync.detachPopupDisplayResync(runtime);
    }
    _popupReadyHandoff.dispatchPopupReadyHandoff(ctx, popup, summary, dockRoot, selectors, lastClickedFilter, lastInteraction);
    return true;
  }

  return { evaluateDockState: evaluateDockState };
});

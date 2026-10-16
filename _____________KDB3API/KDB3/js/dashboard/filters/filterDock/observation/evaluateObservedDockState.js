define([
  "../config/actions.js",
  "../runtime/readDockRoot.js",
  "./readObservedDockPopupContext.js",
  "./dispatchPopupReadyHandoff.js",
  "./applyPopupReadyTransition.js",
  "./syncPopupDisplay.js",
  "./observeDockResyncEvaluators.js"
], function (
  _actions,
  _readDockRoot,
  _popupContext,
  _dispatchPopupReadyHandoff,
  _applyPopupReadyTransition,
  _syncPopupDisplay,
  _resyncEvaluators
) {
  "use strict";

  function __controller(_KDB, _runtime, _dispatch, _options, _mutationSummary) {
    var selectors;
    var dockRoot;
    var lastClickedFilter;
    var lastInteraction;
    var scopeContext;
    var popup;
    var needsResync;
    if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
      return false;
    }
    try {
      selectors = _KDB.elements.selectors.filterDock;
      dockRoot = _readDockRoot(_KDB);
      if (!dockRoot) {
        return false;
      }
      _resyncEvaluators.evaluateDockHeaderResync(_KDB, _mutationSummary || null, dockRoot, selectors);
      _resyncEvaluators.evaluateDockCommittedDisplayResync(_KDB, _mutationSummary || null, dockRoot, selectors);
      _resyncEvaluators.detectAndDispatchFiltersReady(_KDB, _runtime, _dispatch, dockRoot, selectors, _options);
      lastClickedFilter = _popupContext.readLastClickedFilter(_KDB);
      lastInteraction = _popupContext.readLastInteraction(_KDB);
      scopeContext = _popupContext.readPopupScopeContext(_KDB, _runtime, selectors, lastClickedFilter);
      popup = _popupContext.readPopupSnapshot(_KDB, _runtime, selectors, dockRoot, scopeContext);
      _dispatch({
        type: _actions.POPUP_OBSERVED,
        payload: { popup: popup }
      });
      needsResync = _popupContext.ownerNeedsResync(_KDB);
      if (!popup.isVisible) {
        _syncPopupDisplay.detach(_runtime);
        _applyPopupReadyTransition.resetPopupReadyState(_runtime);
        return true;
      }
      if (!needsResync && (!popup.hasOptions || popup.optionCount < 1)) {
        _syncPopupDisplay.detach(_runtime);
        _applyPopupReadyTransition.resetPopupReadyState(_runtime);
        return true;
      }
      if (needsResync && (!popup.hasOptions || popup.optionCount < 1)) {
        return true;
      }
      if (!needsResync) {
        _syncPopupDisplay.detach(_runtime);
      }
      _dispatchPopupReadyHandoff(
        _KDB,
        _runtime,
        popup,
        _mutationSummary || null,
        dockRoot,
        selectors,
        lastClickedFilter,
        lastInteraction,
        _options
      );
      return true;
    } catch (error) {
      console.error("[filterDock.evaluateObservedDockState] failed", error);
      return false;
    }
  }

  return __controller;
});

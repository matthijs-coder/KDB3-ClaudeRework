define([
  "../effects/dispatchFilterHandoff.js",
  "./applyPopupReadyTransition.js",
  "./readPopupSelectionSyncGap.js"
], function (
  _dispatchFilterHandoff,
  _applyPopupReadyTransition,
  _readPopupSelectionSyncGap
) {
  "use strict";

  function __controller(
    _KDB,
    _runtime,
    _popup,
    _mutationSummary,
    _dockRoot,
    _selectors,
    _lastClickedFilter,
    _lastInteraction,
    _options
  ) {
    var selectionSyncGap;
    var postReadyDecision;
    var handoff;
    if (
      _applyPopupReadyTransition.shouldDispatchPopupReadyTransition(
        _runtime,
        _popup,
        _lastClickedFilter
      )
    ) {
      handoff = _applyPopupReadyTransition.buildPopupReadyHandoff(
        _lastClickedFilter,
        _lastInteraction,
        _popup
      );
    } else {
      selectionSyncGap = _readPopupSelectionSyncGap(_dockRoot, _selectors, _runtime);
      postReadyDecision = _applyPopupReadyTransition.evaluatePostReadyResync(
        _runtime,
        _popup,
        _lastClickedFilter,
        _mutationSummary,
        selectionSyncGap
      );
      if (!postReadyDecision.dispatch) {
        return;
      }
      handoff = _applyPopupReadyTransition.buildPopupReadyHandoff(
        _lastClickedFilter,
        _lastInteraction,
        _popup
      );
    }
    if (!handoff || !handoff.filterKey || !String(handoff.filterKey).trim()) {
      console.warn("[filterDock.dispatchPopupReadyHandoff] skipped: missing filterKey");
      return;
    }
    _dispatchFilterHandoff(_KDB, handoff, "popupReady");
  }

  return __controller;
});

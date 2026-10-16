define([
  "./popupReadyFilterMatch.js",
  "./buildPopupReadyHandoff.js",
  "./decidePostReadyResync.js",
  "./resetPopupReadySession.js",
  "./shouldDispatchPopupReadyTransition.js"
], function (
  _popupReadyFilterMatch,
  _buildPopupReadyHandoff,
  _decidePostReadyResync,
  _resetPopupReadySession,
  _shouldDispatchPopupReadyTransition
) {
  "use strict";

  function evaluatePostReadyResync(
    _runtime,
    _popup,
    _lastClickedFilter,
    _mutationSummary,
    _selectionSyncGap
  ) {
    var state = _resetPopupReadySession.ensurePopupReadyState(_runtime);
    return _decidePostReadyResync(
      state,
      _popup,
      _lastClickedFilter,
      _mutationSummary,
      _selectionSyncGap
    );
  }

  return {
    resetPopupReadyState: _resetPopupReadySession.resetPopupReadyState,
    resetSessionOnSingleSelectClick: _resetPopupReadySession.resetSessionOnSingleSelectClick,
    isPopupReady: _popupReadyFilterMatch.isPopupReady,
    shouldDispatchPopupReadyTransition:
      _shouldDispatchPopupReadyTransition.shouldDispatchPopupReadyTransition,
    evaluatePostReadyResync: evaluatePostReadyResync,
    buildPopupReadyHandoff: _buildPopupReadyHandoff
  };
});

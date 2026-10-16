define([
  "./popupReadyFilterMatch.js",
  "./resetPopupReadySession.js"
], function (_popupReadyFilterMatch, _resetPopupReadySession) {
  "use strict";

  function shouldDispatchPopupReadyTransition(_runtime, _popup, _lastClickedFilter) {
    var state;
    var ready;
    var activeFilterKey;
    if (!_runtime || !_lastClickedFilter) {
      return false;
    }
    state = _resetPopupReadySession.ensurePopupReadyState(_runtime);
    ready = _popupReadyFilterMatch.isPopupReady(_popup);
    activeFilterKey = _popupReadyFilterMatch.readActiveFilterKey(_popup, _lastClickedFilter);
    if (!ready || !activeFilterKey) {
      if (state.isReady) {
        _resetPopupReadySession.clearReadySession(state);
      }
      return false;
    }
    if (!_popupReadyFilterMatch.popupMatchesActiveFilter(_popup, _lastClickedFilter)) {
      if (state.isReady) {
        _resetPopupReadySession.clearReadySession(state);
      }
      return false;
    }
    if (state.activeFilterKey !== activeFilterKey) {
      state.isReady = false;
      state.postReadyResyncDispatched = false;
      state.lastAttributeSignature = null;
    }
    if (state.isReady && state.activeFilterKey === activeFilterKey) {
      return false;
    }
    state.isReady = true;
    state.activeFilterKey = activeFilterKey;
    state.postReadyResyncDispatched = false;
    state.mutationGeneration = 0;
    state.lastAttributeSignature = null;
    return true;
  }

  return {
    shouldDispatchPopupReadyTransition: shouldDispatchPopupReadyTransition
  };
});

define([], function () {
  "use strict";

  function ensurePopupReadyState(_runtime) {
    if (!_runtime.popupReadyState) {
      _runtime.popupReadyState = {
        activeFilterKey: null,
        isReady: false,
        postReadyResyncDispatched: false,
        mutationGeneration: 0,
        lastAttributeSignature: null
      };
    }
    return _runtime.popupReadyState;
  }

  function clearReadySession(_state) {
    _state.isReady = false;
    _state.activeFilterKey = null;
    _state.postReadyResyncDispatched = false;
    _state.lastAttributeSignature = null;
  }

  function resetPopupReadyState(_runtime) {
    if (_runtime.popupReadyState) {
      clearReadySession(_runtime.popupReadyState);
    }
  }

  function isSingleSelectFamilyFilterType(_filterType) {
    return (
      _filterType === "singleSelect" ||
      _filterType === "specialSingleSelect" ||
      _filterType === "sicht"
    );
  }

  function resetSessionOnSingleSelectClick(_runtime, _interaction) {
    var interactionType;
    if (!_runtime || !_interaction || !isSingleSelectFamilyFilterType(_interaction.filterType)) {
      return false;
    }
    interactionType = _interaction.interactionType;
    if (
      interactionType === "open" ||
      interactionType === "confirm" ||
      interactionType === "cancel" ||
      interactionType === "close"
    ) {
      resetPopupReadyState(_runtime);
      return true;
    }
    return false;
  }

  return {
    ensurePopupReadyState: ensurePopupReadyState,
    clearReadySession: clearReadySession,
    resetPopupReadyState: resetPopupReadyState,
    resetSessionOnSingleSelectClick: resetSessionOnSingleSelectClick
  };
});

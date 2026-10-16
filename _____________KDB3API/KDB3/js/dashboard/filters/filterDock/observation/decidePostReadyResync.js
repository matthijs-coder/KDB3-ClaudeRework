define(["./popupReadyFilterMatch.js"], function (_popupReadyFilterMatch) {
  "use strict";

  function hasRelevantMutation(_summary) {
    if (!_summary) {
      return false;
    }
    return !!(
      _summary.addedCount ||
      _summary.removedCount ||
      _summary.attributeCount ||
      _summary.hasAttributeMutations === true
    );
  }

  function __controller(_state, _popup, _lastClickedFilter, _mutationSummary, _selectionSyncGap) {
    var summary;
    if (!_state || !_lastClickedFilter) {
      return { dispatch: false, reason: "missingInput" };
    }
    if (!_popupReadyFilterMatch.isSingleSelectFamily(_lastClickedFilter)) {
      return { dispatch: false, reason: "notSingleSelectFamily" };
    }
    if (_state.isReady !== true) {
      return { dispatch: false, reason: "popupNotReadySession" };
    }
    if (_state.postReadyResyncDispatched === true) {
      return { dispatch: false, reason: "followUpAlreadyDispatched" };
    }
    if (
      !_popupReadyFilterMatch.isPopupReady(_popup) ||
      !_popupReadyFilterMatch.popupMatchesActiveFilter(_popup, _lastClickedFilter)
    ) {
      return { dispatch: false, reason: "popupNotMatchingActiveFilter" };
    }
    summary = _mutationSummary || null;
    if (!hasRelevantMutation(summary)) {
      return { dispatch: false, reason: "noRelevantMutation" };
    }
    if (_selectionSyncGap === true) {
      _state.postReadyResyncDispatched = true;
      _state.mutationGeneration = (_state.mutationGeneration || 0) + 1;
      return { dispatch: true, reason: "selectionSyncGap" };
    }
    if (summary.hasNonKdbAttributeMutations === true || summary.nonKdbAttributeCount > 0) {
      _state.postReadyResyncDispatched = true;
      _state.mutationGeneration = (_state.mutationGeneration || 0) + 1;
      if (summary.lastNonKdbAttributeSignature) {
        _state.lastAttributeSignature = summary.lastNonKdbAttributeSignature;
      } else if (summary.lastAttributeSignature) {
        _state.lastAttributeSignature = summary.lastAttributeSignature;
      }
      return { dispatch: true, reason: "nonKdbAttributeMutation" };
    }
    if (summary.hasAttributeMutations === true) {
      if (summary.lastAttributeSignature) {
        _state.lastAttributeSignature = summary.lastAttributeSignature;
      }
      return { dispatch: false, reason: "kdbOnlyAttributeMutation" };
    }
    return { dispatch: false, reason: "noQualifyingSignal" };
  }

  return __controller;
});

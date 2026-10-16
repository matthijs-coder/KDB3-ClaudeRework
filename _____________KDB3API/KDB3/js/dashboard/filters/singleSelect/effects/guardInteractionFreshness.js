define(["../state/selection.js"], function (_selectionState) {
  "use strict";

  function isSelectionChangeIntent(_intentType) {
    return _intentType === "clear" || _intentType === "alle" || _intentType === "option";
  }

  function buildInteractionOptions(_options, _handoffContext) {
    return Object.assign({}, _options || {}, {
      actionType: _options.actionType,
      interactionSequence: _options.interactionSequence
    });
  }

  function hasUnsavedPendingSelection(_filterState) {
    if (!_filterState) {
      return false;
    }
    return (
      _selectionState.getPendingDisplayValue(_filterState.pendingSelection) !==
      _selectionState.getConfirmedDisplayValue(_filterState.backupSelection)
    );
  }

  function shouldSkipPopupReadyHydrate(_filterState) {
    return hasUnsavedPendingSelection(_filterState);
  }

  function buildPopupReadyInteractionOptions(_options, _handoffContext, _filterState) {
    var interactionOptions = buildInteractionOptions(_options, _handoffContext);
    interactionOptions.filterState = _filterState;
    interactionOptions.skipDomHydrate = shouldSkipPopupReadyHydrate(_filterState);
    interactionOptions.forceFreshPopupMount = true;
    return interactionOptions;
  }

  return {
    isSelectionChangeIntent: isSelectionChangeIntent,
    buildInteractionOptions: buildInteractionOptions,
    buildPopupReadyInteractionOptions: buildPopupReadyInteractionOptions,
    hasUnsavedPendingSelection: hasUnsavedPendingSelection,
    shouldSkipPopupReadyHydrate: shouldSkipPopupReadyHydrate
  };
});

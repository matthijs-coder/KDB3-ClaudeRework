define([
  "../state/instance.js",
  "./deriveInteractionIntent.js",
  "./runPopupInteractionSteps.js",
  "./requestFilterDockPopupAction.js",
  "../runtime.js",
  "./guardInteractionFreshness.js"
], function (
  _ensureFilterState,
  _deriveInteractionIntent,
  _popupSteps,
  _requestFilterDockPopupAction,
  _singleSelectRuntime,
  _guardInteractionFreshness
) {
  "use strict";

  function invokeOriginalCancelClick(_KDB, _handoffContext, _options) {
    var singleSelectRoot = _KDB.state.filters.singleSelect;
    try {
      singleSelectRoot.meta.isProgrammaticClick = true;
      _requestFilterDockPopupAction.requestOriginalButtonClick(
        _KDB,
        _handoffContext,
        "cancelClickable",
        _options
      );
    } finally {
      singleSelectRoot.meta.isProgrammaticClick = false;
    }
  }

  function invokeClosePopup(_KDB, _options) {
    _requestFilterDockPopupAction.requestClosePopup(_KDB, _options);
  }

  async function runInteraction(_KDB, _runtime, _handoffContext, _options) {
    var options = _options || {};
    var singleSelectRoot = _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    var filterState;
    var interactionOptions;
    var intent;
    if (!singleSelectRoot || singleSelectRoot.meta.isProgrammaticClick === true) {
      return;
    }

    filterState = _ensureFilterState.ensureFilterState(_KDB, _handoffContext);
    interactionOptions = _guardInteractionFreshness.buildInteractionOptions(options, _handoffContext);
    interactionOptions.filterState = filterState;

    if (options.actionType === "singleSelect/filterDockPopupReady") {
      interactionOptions = _guardInteractionFreshness.buildPopupReadyInteractionOptions(
        options,
        _handoffContext,
        filterState
      );
      await _popupSteps.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      return;
    }

    intent = _deriveInteractionIntent(_handoffContext);
    if (filterState.isCommitInProgress === true ||
      _singleSelectRuntime.inFlight.isActive(_runtime, _handoffContext.filterInstanceId)) {
      return;
    }

    if (_guardInteractionFreshness.isSelectionChangeIntent(intent.type)) {
      if (_singleSelectRuntime.isStaleInteraction(filterState, options.interactionSequence)) {
        return;
      }
      _popupSteps.applyPendingSelection(_handoffContext, filterState, intent);
      _singleSelectRuntime.markInteractionApplied(filterState, options.interactionSequence);
      interactionOptions.skipDomHydrate = true;
      interactionOptions.forceFreshPopupMount = true;
      await _popupSteps.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      return;
    }

    if (intent.type === "confirm") {
      if (_singleSelectRuntime.isStaleInteraction(filterState, options.interactionSequence)) {
        return;
      }
      interactionOptions.skipDomHydrate = true;
      await _popupSteps.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      await _popupSteps.commitConfirmedSelection(_KDB, _runtime, _handoffContext, filterState, options);
      return;
    }
    if (intent.type === "cancel") {
      _popupSteps.revertToBackupSelection(filterState);
      await _popupSteps.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      invokeOriginalCancelClick(_KDB, _handoffContext, options);
      invokeClosePopup(_KDB, options);
      return;
    }
    if (intent.type === "close") {
      _popupSteps.revertToBackupSelection(filterState);
      await _popupSteps.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      return;
    }
    await _popupSteps.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
  }

  return {
    runInteraction: runInteraction
  };
});

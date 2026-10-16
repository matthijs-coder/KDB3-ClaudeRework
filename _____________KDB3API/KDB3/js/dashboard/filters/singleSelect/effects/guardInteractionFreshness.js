define(["../state/selectionState.js"], function (_selectionState) {
  "use strict";

  function bumpInteractionSequence(_filterState) {
    var next = (_filterState.appliedInteractionSeq || 0) + 1;
    _filterState.appliedInteractionSeq = next;
    return next;
  }

  function markInteractionApplied(_filterState, _sequence) {
    if (!_filterState || !_sequence) {
      return;
    }
    _filterState.appliedInteractionSeq = Math.max(_filterState.appliedInteractionSeq || 0, _sequence);
  }

  function isStaleInteraction(_filterState, _sequence) {
    if (!_filterState || !_sequence) {
      return false;
    }
    return _sequence < (_filterState.appliedInteractionSeq || 0);
  }

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

  function resetSingleSelectRuntime(_runtime) {
    var key;
    var entry;
    for (key in _runtime.listeners || {}) {
      if (Object.prototype.hasOwnProperty.call(_runtime.listeners, key)) {
        entry = _runtime.listeners[key];
        if (typeof entry === "function") {
          entry();
        }
      }
    }
    for (key in _runtime.observers || {}) {
      if (Object.prototype.hasOwnProperty.call(_runtime.observers, key)) {
        entry = _runtime.observers[key];
        if (entry && typeof entry.disconnect === "function") {
          entry.disconnect();
        }
      }
    }
    for (key in _runtime.timers || {}) {
      if (Object.prototype.hasOwnProperty.call(_runtime.timers, key)) {
        clearTimeout(_runtime.timers[key]);
      }
    }
    for (key in _runtime.abortControllers || {}) {
      if (
        Object.prototype.hasOwnProperty.call(_runtime.abortControllers, key) &&
        _runtime.abortControllers[key]
      ) {
        _runtime.abortControllers[key].abort();
      }
    }
    _runtime.domRefs = {};
    _runtime.listeners = {};
    _runtime.subscriptions = {};
    _runtime.abortControllers = {};
    _runtime.observers = {};
    _runtime.timers = {};
    _runtime.pendingPromises = {};
    _runtime.inFlight = {};
    _runtime.filtersFacet = null;
    _runtime.delegatedOperationIds = {};
    _runtime.tabMutationSnapshots = {};
    _runtime.inventoryOwnerNotifications = {};
    delete _runtime.lastInventoryNotificationGeneration;
    delete _runtime.reconcileRunId;
    delete _runtime.parameterSetRunId;
    delete _runtime.tabMutationRunId;
    delete _runtime.tabMutationOperationId;
  }

  return {
    bumpInteractionSequence: bumpInteractionSequence,
    markInteractionApplied: markInteractionApplied,
    isStaleInteraction: isStaleInteraction,
    isSelectionChangeIntent: isSelectionChangeIntent,
    buildInteractionOptions: buildInteractionOptions,
    buildPopupReadyInteractionOptions: buildPopupReadyInteractionOptions,
    hasUnsavedPendingSelection: hasUnsavedPendingSelection,
    shouldSkipPopupReadyHydrate: shouldSkipPopupReadyHydrate,
    resetSingleSelectRuntime: resetSingleSelectRuntime
  };
});

define([
  "./selection.js",
  "./hydrateInitialSelectionFromHandoff.js"
], function (_selectionState, _hydrateInitialSelectionFromHandoff) {
  "use strict";

  function ensureInstances(_root) {
    if (!_root.instancesById) { _root.instancesById = {}; }
  }

  function createDelegatedWorkingState(_handoff) {
    if (_handoff._delegatedWorkingState) { return _handoff._delegatedWorkingState; }
    var context = _handoff.ownerSelectionContext || {};
    var initial = _hydrateInitialSelectionFromHandoff.resolveInitialSelections(null, _handoff);
    var current = context.currentSelection || {
      displayValue: initial.initialDisplayValue,
      useValue: initial.initialUseValue
    };
    var backup = context.backupSelection || current;
    var pending = context.pendingSelection || { displayValue: current.displayValue };
    _handoff._delegatedWorkingState = {
      currentSelection: _selectionState.normalizeConfirmedSelection(current),
      backupSelection: _selectionState.normalizeConfirmedSelection(backup),
      pendingSelection: _selectionState.normalizePendingSelection(pending),
      isCommitInProgress: false,
      hasAlleOption: false,
      condition: null,
      appliedInteractionSeq: 0
    };
    return _handoff._delegatedWorkingState;
  }

  function __controller(_KDB, _handoff) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.state.filters.singleSelect = _KDB.state.filters.singleSelect || {};

    var singleSelectRoot = _KDB.state.filters.singleSelect;
    if (!singleSelectRoot.meta) {
      singleSelectRoot.meta = { isProgrammaticClick: false };
    }
    ensureInstances(singleSelectRoot);

    var filterScope = _handoff.filterScope || _handoff.scopeType || "global";
    var filterLabel = _handoff.filterLabel;
    var filterInstanceId = _handoff.filterInstanceId;
    if (!filterInstanceId) {
      throw new Error("filterInstanceId is required before interaction state resolution");
    }
    if (_handoff.filterType === "sicht" ||
      (singleSelectRoot.instancesById[filterInstanceId] &&
        singleSelectRoot.instancesById[filterInstanceId].selectionOwner === "sicht")) {
      return createDelegatedWorkingState(_handoff);
    }

    if (!singleSelectRoot.instancesById[filterInstanceId]) {
      throw new Error("canonical filter instance is missing: " + filterInstanceId);
    }

    var filterState = singleSelectRoot.instancesById[filterInstanceId];
    filterState.filterKey =
      _handoff.filterKey || _handoff.filterId || filterScope + "__" + filterLabel;
    filterState.currentSelection = _selectionState.normalizeConfirmedSelection(
      filterState.currentSelection
    );
    filterState.backupSelection = _selectionState.normalizeConfirmedSelection(
      filterState.backupSelection
    );
    filterState.pendingSelection = _selectionState.normalizePendingSelection(
      filterState.pendingSelection
    );
    filterState.isCommitInProgress = filterState.isCommitInProgress === true;
    filterState.hasAlleOption = _handoff.hasAlleOption === true;
    filterState.condition = _handoff.condition || null;
    filterState.lastInteractionTs = Date.now();
    filterState.hostStatus = "present";
    if (filterState.timestamps) { filterState.timestamps.interactionAt = filterState.lastInteractionTs; }

    _hydrateInitialSelectionFromHandoff.applyRightsForcedSelectionIfNeeded(_handoff, filterState);

    return filterState;
  }

  return __controller;
});

define([
  "../state/selectionState.js",
  "../state/selectors.js"
], function (_selectionState, _selectors) {
  "use strict";

  // Builder per historyService-filterInstanceIdentity-contractdelta.md §3/§4:
  // both old and new carry the live identity tuple (filterInstanceId,
  // scopeType, raw scopeId, itemId, semanticInstanceKey, filterLabel) plus
  // independent displayValue/useValue/displaySource. Identity is read once
  // from the live record so old/new can never disagree on which instance
  // they describe.

  function readIdentity(_KDB, _filterInstanceId) {
    var record = _filterInstanceId ? _selectors.readFilterInstance(_KDB, _filterInstanceId) : null;
    if (!record || record.selectionOwner !== "singleSelect") {
      return null;
    }
    return {
      filterInstanceId: record.filterInstanceId,
      scopeType: record.scopeType,
      scopeId: record.scopeId,
      itemId: record.itemId == null ? null : record.itemId,
      semanticInstanceKey: record.semanticInstanceKey || null,
      filterLabel: record.filterLabel
    };
  }

  function readDisplaySource(_selection) {
    if (_selection.displaySource) { return _selection.displaySource; }
    return _selection.displayValue === null ? "unavailable" : "cognos";
  }

  function createStepValue(_identity, _confirmedSelection) {
    var selection = _selectionState.normalizeConfirmedSelection(_confirmedSelection);
    return Object.assign({}, _identity, {
      displayValue: selection.displayValue,
      useValue: selection.useValue,
      displaySource: readDisplaySource(selection)
    });
  }

  function __controller(_KDB, _handoffContext, _oldConfirmedSelection, _newConfirmedSelection) {
    var handoff = _handoffContext || {};
    var identity = readIdentity(_KDB, handoff.filterInstanceId);
    if (!identity) {
      console.warn("[singleSelect.buildCommittedStep] no live instance for history step; step skipped", {
        filterInstanceId: handoff.filterInstanceId
      });
      return null;
    }
    return {
      key: "filter_singleSelect",
      timestamp: Date.now(),
      old: createStepValue(identity, _oldConfirmedSelection),
      new: createStepValue(identity, _newConfirmedSelection)
    };
  }

  return __controller;
});

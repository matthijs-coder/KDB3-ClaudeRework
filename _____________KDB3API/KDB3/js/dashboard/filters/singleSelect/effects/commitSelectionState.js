define(["../state/selectionState.js"], function (_selectionState) {
  "use strict";

  function applyConfirmedState(_filterState, _singleSelectRoot, _nextConfirmedSelection) {
    var nextDisplay = _nextConfirmedSelection.displayValue;
    var nextUse = _nextConfirmedSelection.useValue;
    var displaySource = _nextConfirmedSelection.displaySource || "cognos";
    var normalized = nextDisplay === null
      ? { displayValue: null, useValue: nextUse == null ? "" : String(nextUse), displaySource: displaySource }
      : Object.assign(_selectionState.createConfirmedSelection(nextDisplay, nextUse), { displaySource: displaySource });
    _filterState.currentSelection = normalized;
    _filterState.backupSelection = Object.assign({}, normalized);
    _filterState.pendingSelection = _selectionState.createPendingSelection(nextDisplay === null ? "Alle" : nextDisplay);
    _filterState.lastConfirmedTs = Date.now();
    if (_filterState.timestamps) { _filterState.timestamps.confirmedAt = _filterState.lastConfirmedTs; }
    _singleSelectRoot.lastConfirmedAt = _filterState.lastConfirmedTs;
  }

  function revertFilterState(_filterState, _previous) {
    var previous = _selectionState.normalizeConfirmedSelection(_previous);
    _filterState.currentSelection = Object.assign({}, previous);
    _filterState.backupSelection = Object.assign({}, previous);
    _filterState.pendingSelection = _selectionState.createPendingSelection(
      previous.displayValue === null ? "Alle" : previous.displayValue
    );
  }

  function isFromAlleBackup(_filterState, _selectionLabel) {
    var backup;
    if (!_filterState || _selectionLabel === "Alle") {
      return false;
    }
    backup = _selectionState.normalizeConfirmedSelection(_filterState.backupSelection);
    return backup.displayValue === "Alle";
  }

  return {
    applyConfirmedState: applyConfirmedState,
    revertFilterState: revertFilterState,
    isFromAlleBackup: isFromAlleBackup
  };
});

define(["../state/selection.js"], function (_selectionState) {
  "use strict";

  function __controller(_filterState) {
    if (!_filterState) {
      return "Alle";
    }
    var selectionLabel = _selectionState.getConfirmedDisplayValue(_filterState.backupSelection);
    _filterState.pendingSelection = _selectionState.createPendingSelection(selectionLabel);
    return selectionLabel;
  }

  return __controller;
});

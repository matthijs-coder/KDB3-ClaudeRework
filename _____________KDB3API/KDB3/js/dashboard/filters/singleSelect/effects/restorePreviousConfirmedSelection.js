define([
  "../state/selectionState.js",
  "./verifyCommitFilterValue.js",
  "./readFiltersFacet.js",
  "./hostFilterWrite.js"
], function (_selectionState, _verifyCommit, _readFiltersFacet, _hostWrite) {
  "use strict";

  async function __controller(_KDB, _filterRef, _previousConfirmedSelection, _previousHostValues) {
    var filtersFacet = _readFiltersFacet(_KDB);
    var selection = _selectionState.normalizeConfirmedSelection(_previousConfirmedSelection);
    var values = Array.isArray(_previousHostValues) ? _previousHostValues : [];
    if (!_hostWrite.isWriteReady(filtersFacet) || !_filterRef) {
      return;
    }
    if (!Array.isArray(_previousHostValues) && selection.displayValue === null) {
      console.error("[singleSelect.restorePreviousConfirmedSelection] display unavailable for rollback");
      return false;
    }
    if (!Array.isArray(_previousHostValues) && selection.displayValue !== "Alle") {
      values = [{ u: selection.useValue, d: selection.displayValue }];
    }
    try {
      if (!(await _hostWrite.writeValues(filtersFacet, _filterRef, values))) {
        return false;
      }
      var expected = values.length > 0
        ? { displayValue: values[0].d, useValue: values[0].u }
        : { displayValue: "Alle", useValue: "" };
      if (!_verifyCommit(filtersFacet, _filterRef, expected).ok) {
        console.error("[singleSelect.restorePreviousConfirmedSelection] rollback reread mismatch");
        return false;
      }
    } catch (error) {
      console.error("[singleSelect.restorePreviousConfirmedSelection] rollback failed", {
        displayValue: selection.displayValue
      }, error);
      return false;
    }
    return true;
  }

  return __controller;
});

define(["../view/applySingleSelectCommittedDisplay.js"], function (_applyCommittedDisplay) {
  "use strict";

  function isEligibleRecord(_record) {
    var selection;
    var displayValue;
    if (!_record || _record.selectionOwner !== "singleSelect") {
      return false;
    }
    if (_record.status !== "active" || _record.hostStatus !== "present") {
      return false;
    }
    if (_record.isCommitInProgress === true) {
      return false;
    }
    selection = _record.currentSelection || {};
    if (selection.displaySource !== "table") {
      return false;
    }
    displayValue = selection.displayValue;
    if (displayValue == null || String(displayValue).trim() === "") {
      return false;
    }
    return true;
  }

  function __controller(_KDB) {
    try {
      var root;
      var instancesById;
      var ids;
      var idx;
      var record;
      root = _KDB && _KDB.state && _KDB.state.filters
        ? _KDB.state.filters.singleSelect
        : null;
      instancesById = root && root.instancesById;
      if (!instancesById) {
        return;
      }
      ids = Object.keys(instancesById);
      for (idx = 0; idx < ids.length; idx += 1) {
        record = instancesById[ids[idx]];
        if (!isEligibleRecord(record)) {
          continue;
        }
        _applyCommittedDisplay(record);
      }
    } catch (error) {
      console.error("[singleSelect.handleFilterDockCommittedDisplayObserved] failed", error);
    }
  }

  return __controller;
});

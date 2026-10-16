define([
  "./applyPendingSelection.js",
  "../commit/commitSelection.js",
  "./revertToBackupSelection.js",
  "../dockHandoff/popup.js"
], function (
  _applyPendingSelection,
  _commitConfirmedSelection,
  _revertToBackupSelection,
  _popup
) {
  "use strict";

  return {
    applyPendingSelection: _applyPendingSelection,
    commitConfirmedSelection: _commitConfirmedSelection.commitConfirmedSelection,
    revertToBackupSelection: _revertToBackupSelection,
    restorePopupSelection: _popup.restorePopupSelection
  };
});

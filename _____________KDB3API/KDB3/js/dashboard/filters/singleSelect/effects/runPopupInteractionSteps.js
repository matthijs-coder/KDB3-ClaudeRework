define([
  "./applyPendingSelection.js",
  "./commitConfirmedSelection.js",
  "./revertToBackupSelection.js",
  "./restorePopupSelection.js"
], function (
  _applyPendingSelection,
  _commitConfirmedSelection,
  _revertToBackupSelection,
  _restorePopupSelection
) {
  "use strict";

  return {
    applyPendingSelection: _applyPendingSelection,
    commitConfirmedSelection: _commitConfirmedSelection,
    revertToBackupSelection: _revertToBackupSelection,
    restorePopupSelection: _restorePopupSelection
  };
});

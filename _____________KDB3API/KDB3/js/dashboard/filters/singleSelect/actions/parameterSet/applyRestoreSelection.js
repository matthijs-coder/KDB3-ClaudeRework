define([
  "./applyRestoreSelectionCore.js",
  "../../config/parameterSetCodes.js"
], function (
  _applyRestoreSelectionCore,
  _codes
) {
  "use strict";

  async function applyRestoreSelection(_KDB, _runtimeState, _instance, _entry, _runId, _payload) {
    try {
      return await _applyRestoreSelectionCore(
        _KDB,
        _runtimeState,
        _instance,
        _entry,
        _runId,
        _payload
      );
    } catch (error) {
      console.error("[singleSelect.applyRestoreSelection] failed", {
        filterInstanceId: _instance && _instance.filterInstanceId
      }, error);
      return {
        committed: false,
        cancelled: true,
        degraded: false,
        diagnostic: {
          code: _codes.RESTORE_FAILED,
          message: String(error && error.message ? error.message : error)
        }
      };
    }
  }

  return applyRestoreSelection;
});

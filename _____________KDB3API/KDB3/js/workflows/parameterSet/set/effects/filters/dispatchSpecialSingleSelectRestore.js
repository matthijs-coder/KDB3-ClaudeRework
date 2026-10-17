define(["../../../../../core/config/writebackErrorCodes.js"], function (_errorCodes) {
  "use strict";

  async function dispatchSpecialSingleSelectRestore(_run, _resolvedTargets, _terminalInventoryGeneration) {
    var owner;
    const phase = await _run.dispatchOwnerPhase({
      phaseName: "specialSingleSelectRestoreSync", owner: "specialSingleSelect",
      type: "specialSingleSelect/syncRequested",
      payload: {
        reason: "parameterRestore",
        tabIdxToScopeId: _resolvedTargets,
        inventoryGeneration: _terminalInventoryGeneration
      },
      skipHistoryFlag: false,
      required: false, degradedAllowed: true,
      failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED
    });
    owner = phase && phase.result;
    _run.specialSingleSelectRestoreHint = {
      clearedRestoredValues: (owner && owner.specialSingleSelectRestoreHint
        && Array.isArray(owner.specialSingleSelectRestoreHint.clearedRestoredValues))
        ? owner.specialSingleSelectRestoreHint.clearedRestoredValues
        : [],
      appliedDefaultLabels: (owner && owner.specialSingleSelectRestoreHint
        && Array.isArray(owner.specialSingleSelectRestoreHint.appliedDefaultLabels))
        ? owner.specialSingleSelectRestoreHint.appliedDefaultLabels
        : []
    };
    return undefined;
  }

  return dispatchSpecialSingleSelectRestore;
});

define([
  "../../schema/errorCodes.js"
], function (_errorCodes) {
  "use strict";

  async function dispatchFilterClearPhases(run, inventoryGeneration, resolvedTargets, includeDienststelle, includeNativeMultiSelect, allowedClearTabIdxs) {
    try {
      await run.dispatchOwnerPhase({
        phaseName: "filterClear", owner: "sicht",
        type: "sicht/parameterSetClearRequested",
        payload: {
          status: run.status, tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration,
          allowedClearTabIdxs: allowedClearTabIdxs
        },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_CLEAR_FAILED,
      });
      await run.dispatchOwnerPhase({
        phaseName: "filterClear", owner: "singleSelect",
        type: "singleSelect/parameterSetClearRequested",
        payload: {
          status: run.status, tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration,
          allowedClearTabIdxs: allowedClearTabIdxs
        },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_CLEAR_FAILED,
      });
      if (includeDienststelle) {
        await run.dispatchOwnerPhase({
          phaseName: "filterClear", owner: "dienststelle",
          type: "dienststelle/parameterSetClearRequested",
          payload: {
            status: run.status, tabIdxToScopeId: resolvedTargets,
            allowedClearTabIdxs: allowedClearTabIdxs
          },
          required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_CLEAR_FAILED,
        });
      }
      if (includeNativeMultiSelect) {
        await run.dispatchOwnerPhase({
          phaseName: "filterClear", owner: "nativeMultiSelect",
          type: "nativeMultiSelect/parameterSetClearRequested",
          payload: {
            status: run.status, tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration,
            allowedClearTabIdxs: allowedClearTabIdxs
          },
          required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_CLEAR_FAILED,
        });
      }
    } catch (error) {
      console.error("[writebackSet.dispatchFilterClearPhases] failed", error);
      throw error;
    }
  }

  return dispatchFilterClearPhases;
});

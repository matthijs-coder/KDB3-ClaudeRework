define(["../../schema/errorCodes.js"], function (_errorCodes) {
  "use strict";

  async function dispatchDienststelleRestore(_run, _filt, _resolvedTargets) {
    var owner;
    try {
      if (_filt.dstl === undefined) {
        return undefined;
      }
      const phase = await _run.dispatchOwnerPhase({
        phaseName: "dienststelleRestore", owner: "dienststelle",
        type: "dienststelle/parameterSetRestoreRequested",
        payload: {
          dienststelle: _filt.dstl,
          activeSichtValue: _filt.sicht,
          tabIdxToScopeId: _resolvedTargets,
          options: { mapOldToNew: true, fallbackToDefault: true, hierarchyWaitTimeoutMs: 60000 },
        },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_DIENSTSTELLE_RESTORE_FAILED,
      });
      owner = phase && phase.result;
      _run.dienststelleRestoreHint = {
        fallbackScopes: (owner && owner.fallbackScopes) || [],
        missingValues: (owner && owner.missingValues) || []
      };
      return undefined;
    } catch (err) {
      console.error("[writebackSet.dispatchDienststelleRestore] failed", err);
      throw err;
    }
  }

  return dispatchDienststelleRestore;
});

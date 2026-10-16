define([
  "./claimDelegatedOperationId.js"
], function (_operationIds) {
  "use strict";

  function readDispatch(_KDB) {
    return _KDB && _KDB.api && _KDB.api.singleSelect &&
      typeof _KDB.api.singleSelect.dispatch === "function"
      ? _KDB.api.singleSelect.dispatch : null;
  }

  // Thin wrapper around the certified singleSelect/applyOwnerSelection action.
  // Sicht never writes Cognos or singleSelect state directly on migrated paths;
  // it only awaits the structured result of this delegated dispatch.
  async function dispatchSingleSelectOwnerSelection(_KDB, _payload) {
    var dispatch = readDispatch(_KDB);
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.sicht : null;
    var operationId = _payload && _payload.operationId;
    if (!dispatch) {
      return {
        ok: false,
        degraded: false,
        applied: [],
        diagnostics: [{
          code: "SICHT_SINGLE_SELECT_API_MISSING",
          message: "singleSelect dispatch API unavailable"
        }]
      };
    }
    if (!runtime || !_operationIds.register(runtime, _payload)) {
      return {
        ok: false,
        degraded: false,
        applied: [],
        diagnostics: [{
          code: "SICHT_COMMIT_STALE",
          message: "delegated operationId is missing or already registered"
        }]
      };
    }
    try {
      var result = await dispatch({
        type: "singleSelect/applyOwnerSelection",
        payload: Object.assign({ notifyOwner: "sicht", skipHistory: true }, _payload)
      });
      if (!result || result.ok !== true) {
        _operationIds.abandon(runtime, operationId);
      }
      return result;
    } catch (error) {
      _operationIds.abandon(runtime, operationId);
      console.error("[sicht.dispatchSingleSelectOwnerSelection] failed", {
        filterInstanceId: _payload && _payload.filterInstanceId
      }, error);
      return {
        ok: false,
        degraded: false,
        applied: [],
        diagnostics: [{
          code: "SICHT_SINGLE_SELECT_DISPATCH_FAILED",
          message: String(error && error.message ? error.message : error)
        }]
      };
    }
  }

  return dispatchSingleSelectOwnerSelection;
});

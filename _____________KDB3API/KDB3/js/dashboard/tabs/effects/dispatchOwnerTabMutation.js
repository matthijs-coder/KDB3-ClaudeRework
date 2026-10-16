define([
  "../config/mutationCodes.js"
], function (_codes) {
  "use strict";

  async function dispatchOwnerTabMutation(_KDB, _owner, _type, _plan, _runContext) {
    try {
      var ownerApi = _KDB.api && _KDB.api[_owner];
      if (!ownerApi || typeof ownerApi.dispatch !== "function") {
        return ownerUnavailable(_owner);
      }
      var payload = Object.assign({
        plan: _plan,
        runId: _runContext.runId,
        operationId: _runContext.operationId,
        source: "tabsMutation",
        skipHistory: true
      }, buildOwnerPayload(_owner, _runContext));
      var result = await ownerApi.dispatch({ type: _type, payload: payload });
      if (result === false || !result) { return ownerUnavailable(_owner); }
      return result;
    } catch (err) {
      return {
        ok: false,
        errorCode: _codes.PREPARE_FAILED,
        diagnostics: [{ code: _codes.PREPARE_FAILED, owner: _owner, message: String(err && err.message ? err.message : err) }]
      };
    }
  }

  function buildOwnerPayload(_owner, _runContext) {
    if (_owner === "widgetBase") {
      if (_runContext && _runContext.widgetRebuild === true) {
        return { widgetRebuild: true, serializedByTabId: _runContext.serializedByTabId };
      }
      if (_runContext && _runContext.serializedByTabId) {
        return { serializedByTabId: _runContext.serializedByTabId };
      }
      return {};
    }
    if (_owner !== "singleSelect" && _owner !== "dienststelle" && _owner !== "nativeMultiSelect") { return {}; }
    return { tabIdxToScopeId: _runContext && _runContext.tabTargets ? _runContext.tabTargets : {} };
  }

  function ownerUnavailable(_owner) {
    return {
      ok: false,
      errorCode: _codes.PREPARE_FAILED,
      diagnostics: [{ code: "ownerUnavailable", owner: _owner, message: "Owner API is unavailable in this build wave." }]
    };
  }

  return dispatchOwnerTabMutation;
});

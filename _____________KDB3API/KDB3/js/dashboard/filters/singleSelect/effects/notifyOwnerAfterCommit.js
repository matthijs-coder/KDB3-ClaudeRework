define(["../config/errorCodes.js"], function (_codes) {
  "use strict";

  function resolveOwnerApi(_KDB, _filterType) {
    var apiRoot = _KDB && _KDB.api ? _KDB.api : null;
    if (!apiRoot) { return null; }
    if (_filterType === "sicht") { return apiRoot.sicht || null; }
    if (_filterType === "specialSingleSelect") { return apiRoot.specialSingleSelect || null; }
    return null;
  }

  function buildPayload(_handoffContext, _selection) {
    var filterType = _handoffContext ? _handoffContext.filterType : "";
    var timestamp = _handoffContext && _handoffContext.timestamp != null
      ? Number(_handoffContext.timestamp)
      : Date.now();
    var payload = {
      filterInstanceId: _handoffContext.filterInstanceId || null,
      filterId: _handoffContext.filterId,
      filterKey: _handoffContext.filterKey,
      filterLabel: _handoffContext.filterLabel,
      filterScope: _handoffContext.filterScope,
      selection: {
        displayValue: _selection.displayValue,
        useValue: _selection.useValue,
        displaySource: _selection.displaySource || "cognos"
      },
      operationId: _handoffContext.operationId || null,
      source: _handoffContext.source || "user",
      skipHistory: _handoffContext.skipHistory === true,
      timestamp: timestamp
    };
    if (filterType === "specialSingleSelect") {
      payload.condition = _handoffContext.condition;
    }
    return payload;
  }

  function isNegativeAck(_ack) {
    return _ack === false || (_ack && _ack.ok === false) || (_ack && _ack.acknowledged === false);
  }

  async function notifyOwnerCommit(_KDB, _handoffContext, _selection) {
    try {
      var filterType = _handoffContext ? _handoffContext.filterType : "";
      if (filterType !== "sicht" && filterType !== "specialSingleSelect") {
        return { ok: true, applicable: false };
      }
      var api = resolveOwnerApi(_KDB, filterType);
      if (!api || typeof api.dispatch !== "function") {
        return {
          ok: false,
          applicable: true,
          code: _codes.OWNER_SELECTION_INVALID,
          message: "owner dispatch API unavailable for " + filterType
        };
      }
      var ack = await api.dispatch({
        type: filterType === "sicht" ? "sicht/singleSelectCommitted" : "specialSingleSelect/userSelectionCommitted",
        payload: buildPayload(_handoffContext, _selection)
      });
      if (isNegativeAck(ack)) {
        return {
          ok: false,
          applicable: true,
          code: _codes.OWNER_SELECTION_INVALID,
          message: "owner rejected singleSelect commit notification for " + filterType
        };
      }
      return { ok: true, applicable: true };
    } catch (error) {
      console.error("[singleSelect.notifyOwnerAfterCommit] failed", error);
      return {
        ok: false,
        applicable: true,
        code: _codes.OWNER_SELECTION_INVALID,
        message: "owner dispatch failed: " + String(error && error.message ? error.message : error)
      };
    }
  }

  return {
    notifyOwnerCommit: notifyOwnerCommit
  };
});

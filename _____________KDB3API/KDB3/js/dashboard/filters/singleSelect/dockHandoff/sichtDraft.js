define([
  "../config.js",
  "../commit/ownerNotify.js"
], function (_config, _ownerNotify) {
  "use strict";

  var DRAFT_CHANGED = _ownerNotify.ownerActions.sichtDraftChanged;
  var DRAFT_REVERTED = _ownerNotify.ownerActions.sichtDraftReverted;

  function readSichtOwnerApi(_KDB) {
    return _KDB && _KDB.api && _KDB.api.sicht &&
      typeof _KDB.api.sicht.dispatch === "function"
      ? _KDB.api.sicht : null;
  }

  function buildDraftPayload(_handoffContext, _selection) {
    var displayValue = _selection && _selection.displayValue != null
      ? String(_selection.displayValue)
      : "";
    var timestamp = _handoffContext && _handoffContext.timestamp != null
      ? Number(_handoffContext.timestamp)
      : Date.now();
    return {
      filterInstanceId: _handoffContext.filterInstanceId || null,
      filterKey: _handoffContext.filterKey || null,
      filterLabel: _handoffContext.filterLabel || null,
      filterScope: _handoffContext.filterScope || null,
      tabId: _handoffContext.tabId || null,
      operationId: _handoffContext.operationId || null,
      pendingSelection: {
        displayValue: displayValue
      },
      timestamp: timestamp
    };
  }

  async function dispatchSichtDraftEvent(_KDB, _type, _handoffContext, _selection) {
    try {
      var api = readSichtOwnerApi(_KDB);
      if (!api) {
        return {
          ok: false,
          code: _config.errorCodes.SICHT_DRAFT_DISPATCH_FAILED,
          message: "sicht owner dispatch API unavailable for " + _type
        };
      }
      var ack = await api.dispatch({
        type: _type,
        payload: buildDraftPayload(_handoffContext, _selection)
      });
      if (_ownerNotify.isNegativeAck(ack)) {
        return {
          ok: false,
          code: _config.errorCodes.SICHT_DRAFT_DISPATCH_FAILED,
          message: "sicht owner rejected " + _type
        };
      }
      return { ok: true };
    } catch (error) {
      console.error("[singleSelect.sichtDraft] failed", { type: _type }, error);
      return {
        ok: false,
        code: _config.errorCodes.SICHT_DRAFT_DISPATCH_FAILED,
        message: "sicht owner dispatch threw for " + _type + ": " +
          String(error && error.message ? error.message : error)
      };
    }
  }

  async function dispatchAfterInteraction(_KDB, _handoffContext, _filterState) {
    if (_handoffContext.filterType !== "sicht") {
      return { ok: true, applicable: false };
    }
    if (_handoffContext.interactionType === "cancel" || _handoffContext.interactionType === "close") {
      return dispatchSichtDraftEvent(_KDB, DRAFT_REVERTED, _handoffContext, {
        displayValue: _filterState && _filterState.backupSelection
          ? _filterState.backupSelection.displayValue : null,
        useValue: _filterState && _filterState.backupSelection
          ? _filterState.backupSelection.useValue : null,
        displaySource: "owner"
      });
    }
    if (_filterState && _filterState.pendingSelection && _handoffContext.interactionType !== "confirm") {
      return dispatchSichtDraftEvent(_KDB, DRAFT_CHANGED, _handoffContext, {
        displayValue: _filterState.pendingSelection.displayValue,
        useValue: null,
        displaySource: "draft"
      });
    }
    return { ok: true, applicable: false };
  }

  return {
    dispatchAfterInteraction: dispatchAfterInteraction
  };
});

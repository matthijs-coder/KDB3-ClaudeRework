define([
  "../../singleSelect/state/selectors.js"
], function (_singleSelectSelectors) {
  "use strict";

  function readSichtState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.filters
      ? _KDB.state.filters.sicht
      : null;
  }

  function hasValidIdentity(_KDB, _filterInstanceId) {
    var matches = _singleSelectSelectors.readFilterInstances(_KDB, {
      scopeType: "global",
      status: "active",
      hostStatus: "present"
    }).filter(function (_record) {
      return _record.filterType === "sicht" &&
        _record.selectionOwner === "sicht";
    });
    return matches.length === 1 &&
      matches[0].filterInstanceId === _filterInstanceId;
  }

  function findEnabledDisplay(_state, _displayValue) {
    var byOption = _state && _state.byOption ? _state.byOption : {};
    var keys = Object.keys(byOption);
    var idx;
    var option;
    for (idx = 0; idx < keys.length; idx += 1) {
      option = byOption[keys[idx]];
      if (option && option.isEnabled === true &&
        String(option.displayValue) === _displayValue) {
        return true;
      }
    }
    return false;
  }

  function validateSingleSelectDraftPayload(_KDB, _payload, _actionType) {
    try {
      var payload = _payload || {};
      var filterInstanceId = payload.filterInstanceId
        ? String(payload.filterInstanceId) : "";
      var state = readSichtState(_KDB);
      var timestamp = payload.timestamp != null
        ? Number(payload.timestamp) : Number(payload.observedAt);
      var lastCommittedAt = state && state.meta
        ? Number(state.meta.lastCommittedAt) : 0;
      var isRevert = _actionType === "sicht/singleSelectDraftReverted";
      var selection = payload.pendingSelection || payload.selection || {};
      var displayValue = selection.displayValue != null
        ? String(selection.displayValue) : "";
      var backupDisplayValue = String(state && state.backupSelection
        ? state.backupSelection.displayValue || "" : "");
      if (!filterInstanceId || !hasValidIdentity(_KDB, filterInstanceId)) {
        return {
          ok: false,
          code: "SICHT_INSTANCE_INVALID",
          message: "draft callback does not target the unique live global Sicht instance"
        };
      }
      if (!isFinite(timestamp) ||
        (lastCommittedAt && timestamp < lastCommittedAt)) {
        return {
          ok: false,
          code: "SICHT_COMMIT_STALE",
          message: "draft callback predates the current confirmed Sicht state"
        };
      }
      if (!isRevert && !findEnabledDisplay(state, displayValue)) {
        return {
          ok: false,
          code: "SICHT_DISPLAY_VALUE_INVALID",
          message: "draft displayValue is not a configured enabled Sicht option"
        };
      }
      if (isRevert && displayValue &&
        displayValue !== backupDisplayValue) {
        return {
          ok: false,
          code: "SICHT_COMMIT_STALE",
          message: "reverted draft differs from confirmed Sicht backup"
        };
      }
      return {
        ok: true,
        timestamp: timestamp,
        pendingDisplayValue: isRevert
          ? backupDisplayValue
          : displayValue
      };
    } catch (error) {
      console.error("[sicht.validateSingleSelectDraftPayload] failed", error);
      return {
        ok: false,
        code: "SICHT_DRAFT_HANDLE_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  return validateSingleSelectDraftPayload;
});

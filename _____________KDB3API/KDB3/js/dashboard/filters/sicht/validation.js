define([
  "./config.js",
  "./state.js",
  "./state/selectors.js",
  "./delegation.js"
], function (_config, _state, _selectors, _delegation) {
  "use strict";

  var actions = _state.actions;

  function isDelegatedCommitSource(_source) {
    return Object.prototype.hasOwnProperty.call(_config.COMMIT_SOURCE_FLAGS, _source);
  }

  // Validate the live global instance, configured d/u pair and freshness.
  function validateSingleSelectCommitPayload(_KDB, _payload, _operationEntry) {
    var payload = _payload || {};
    var filterInstanceId = payload.filterInstanceId ? String(payload.filterInstanceId) : "";
    var selection = payload.selection || {};
    var displayValue = selection.displayValue != null ? String(selection.displayValue) : "";
    var useValue = selection.useValue != null ? String(selection.useValue) : "";
    var displaySource = selection.displaySource != null
      ? String(selection.displaySource) : "unknown";
    var record;
    var option;
    var staleReason;
    if (!filterInstanceId) {
      return { ok: false, code: "SICHT_INSTANCE_INVALID", message: "filterInstanceId is required" };
    }
    record = readUniqueLiveInstance(_KDB, filterInstanceId);
    if (!record) {
      return { ok: false, code: "SICHT_INSTANCE_INVALID", message: "filterInstanceId is not the unique live global Sicht descriptor" };
    }
    staleReason = validateCommitFreshness(_KDB, payload, _operationEntry);
    if (staleReason) {
      return { ok: false, code: "SICHT_COMMIT_STALE", message: staleReason };
    }
    if (!validateExpectedSelection(selection, _operationEntry)) {
      return { ok: false, code: "SICHT_COMMIT_STALE", message: "callback selection differs from the delegated request" };
    }
    if (_operationEntry && _operationEntry.operationKind === "clear") {
      if ((displayValue && displayValue !== _config.ALLE_LABEL) || useValue) {
        return { ok: false, code: "SICHT_COMMIT_STALE", message: "clear callback did not confirm an empty host selection" };
      }
      return {
        ok: true,
        record: record,
        option: null,
        isClear: true,
        selection: {
          displayValue: "",
          useValue: "",
          displaySource: "policy"
        }
      };
    }
    if (!displayValue) {
      return { ok: false, code: "SICHT_DISPLAY_VALUE_INVALID", message: "selection.displayValue is required" };
    }
    option = _selectors.findOptionByDisplay(readByOption(_KDB), displayValue);
    if (!option || option.isEnabled !== true) {
      return { ok: false, code: "SICHT_DISPLAY_VALUE_INVALID", message: "displayValue is not a configured enabled Sicht option" };
    }
    if (!useValue) {
      return { ok: false, code: "SICHT_USE_VALUE_MISSING", message: "selection.useValue is required for a non-empty Sicht selection" };
    }
    if (String(option.useValue || "") !== useValue) {
      return { ok: false, code: "SICHT_DISPLAY_VALUE_INVALID", message: "selection display/use pair is not configured for Sicht" };
    }
    return {
      ok: true,
      record: record,
      option: option,
      selection: {
        displayValue: option.displayValue,
        useValue: useValue,
        displaySource: displaySource
      }
    };
  }

  function validateCommitFreshness(_KDB, _payload, _operationEntry) {
    var payload = _payload || {};
    var state = _selectors.readSichtState(_KDB);
    var timestamp = payload.timestamp != null
      ? Number(payload.timestamp) : Number(payload.observedAt);
    var lastCommittedAt = state && state.meta
      ? Number(state.meta.lastCommittedAt) : 0;
    if (!isFinite(timestamp) ||
      (lastCommittedAt && timestamp < lastCommittedAt)) {
      return "callback timestamp predates the current confirmed Sicht state";
    }
    if (!_operationEntry) {
      return isDelegatedCommitSource(payload.source)
        ? "delegated callback has no pending Sicht operation"
        : null;
    }
    if (_operationEntry.status !== "pending" ||
      _operationEntry.filterInstanceId !== payload.filterInstanceId ||
      _operationEntry.source !== payload.source ||
      timestamp < Number(_operationEntry.startedAt || 0)) {
      return "callback does not match the pending delegated Sicht operation";
    }
    if (_operationEntry.inventoryGeneration != null &&
      Number(_delegation.readSingleSelectInventoryGeneration(_KDB)) !==
        Number(_operationEntry.inventoryGeneration)) {
      return "singleSelect inventoryGeneration changed during delegated commit";
    }
    return null;
  }

  function validateExpectedSelection(_selection, _operationEntry) {
    var expected = _operationEntry && _operationEntry.selection;
    if (!expected || _operationEntry.operationKind === "clear") {
      return true;
    }
    return String(expected.displayValue) === String(_selection.displayValue) &&
      String(expected.useValue) === String(_selection.useValue);
  }

  function validateSingleSelectDraftPayload(_KDB, _payload, _actionType) {
    var payload = _payload || {};
    var filterInstanceId = payload.filterInstanceId
      ? String(payload.filterInstanceId) : "";
    var state = _selectors.readSichtState(_KDB);
    var timestamp = payload.timestamp != null
      ? Number(payload.timestamp) : Number(payload.observedAt);
    var lastCommittedAt = state && state.meta
      ? Number(state.meta.lastCommittedAt) : 0;
    var isRevert = _actionType === actions.SINGLE_SELECT_DRAFT_REVERTED;
    var selection = payload.pendingSelection || payload.selection || {};
    var displayValue = selection.displayValue != null
      ? String(selection.displayValue) : "";
    var backupDisplayValue = String(state && state.backupSelection
      ? state.backupSelection.displayValue || "" : "");
    if (!filterInstanceId || !readUniqueLiveInstance(_KDB, filterInstanceId)) {
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
    if (!isRevert && !isEnabledDisplay(state, displayValue)) {
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
  }

  // Draft transitions mutate only pendingSelection and never notify downstream
  // owners or create history.
  function applySingleSelectDraft(_KDB, _dispatchInternal, _payload, _actionType) {
    try {
      var payload = _payload || {};
      var validation = validateSingleSelectDraftPayload(_KDB, payload, _actionType);
      if (validation.ok !== true) {
        return validation;
      }
      _dispatchInternal({
        type: _actionType,
        payload: {
          pendingSelection: {
            displayValue: validation.pendingDisplayValue
          },
          timestamp: validation.timestamp
        }
      });
      return { ok: true };
    } catch (error) {
      console.error("[sicht.applySingleSelectDraft] failed", { actionType: _actionType }, error);
      return {
        ok: false,
        code: "SICHT_DRAFT_HANDLE_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  function readByOption(_KDB) {
    var state = _selectors.readSichtState(_KDB);
    return state && state.byOption ? state.byOption : {};
  }

  function readUniqueLiveInstance(_KDB, _filterInstanceId) {
    var matches = _delegation.readLiveSichtInstances(_KDB);
    if (matches.length !== 1 || matches[0].filterInstanceId !== _filterInstanceId) {
      return null;
    }
    return matches[0];
  }

  function isEnabledDisplay(_state, _displayValue) {
    var option = _selectors.findOptionByDisplay(_state && _state.byOption, _displayValue);
    return !!(option && option.isEnabled === true);
  }

  return {
    isDelegatedCommitSource: isDelegatedCommitSource,
    validateSingleSelectCommitPayload: validateSingleSelectCommitPayload,
    applySingleSelectDraft: applySingleSelectDraft
  };
});

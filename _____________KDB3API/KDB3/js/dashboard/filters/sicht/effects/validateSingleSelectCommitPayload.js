define([
  "../../singleSelect/state/selectors.js",
  "./validateSingleSelectCommitFreshness.js"
], function (_singleSelectSelectors, _validateFreshness) {
  "use strict";

  function readByOption(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    return state && state.byOption ? state.byOption : {};
  }

  function findOptionByDisplay(_byOption, _displayValue) {
    var keys = Object.keys(_byOption || {});
    var idx;
    var option;
    for (idx = 0; idx < keys.length; idx += 1) {
      option = _byOption[keys[idx]];
      if (option && option.displayValue === _displayValue) {
        return option;
      }
    }
    return null;
  }

  function validateIdentity(_KDB, _filterInstanceId) {
    var matches = _singleSelectSelectors.readFilterInstances(_KDB, {
      scopeType: "global",
      status: "active",
      hostStatus: "present"
    }).filter(function (_record) {
      return _record.filterType === "sicht" && _record.selectionOwner === "sicht";
    });
    if (matches.length !== 1 || matches[0].filterInstanceId !== _filterInstanceId) {
      return null;
    }
    return matches[0];
  }

  function validateExpectedSelection(_selection, _operationEntry) {
    var expected = _operationEntry && _operationEntry.selection;
    if (!expected || _operationEntry.operationKind === "clear") {
      return true;
    }
    return String(expected.displayValue) === String(_selection.displayValue) &&
      String(expected.useValue) === String(_selection.useValue);
  }

  // Validate the live global instance, configured d/u pair and freshness.
  function validateSingleSelectCommitPayload(_KDB, _payload, _operationEntry) {
    try {
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
      record = validateIdentity(_KDB, filterInstanceId);
      if (!record) {
        return { ok: false, code: "SICHT_INSTANCE_INVALID", message: "filterInstanceId is not the unique live global Sicht descriptor" };
      }
      staleReason = _validateFreshness(_KDB, payload, _operationEntry);
      if (staleReason) {
        return { ok: false, code: "SICHT_COMMIT_STALE", message: staleReason };
      }
      if (!validateExpectedSelection(selection, _operationEntry)) {
        return { ok: false, code: "SICHT_COMMIT_STALE", message: "callback selection differs from the delegated request" };
      }
      if (_operationEntry && _operationEntry.operationKind === "clear") {
        if ((displayValue && displayValue !== "Alle") || useValue) {
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
      option = findOptionByDisplay(readByOption(_KDB), displayValue);
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
    } catch (error) {
      console.error("[sicht.validateSingleSelectCommitPayload] failed", error);
      return { ok: false, code: "SICHT_INSTANCE_INVALID", message: String(error && error.message ? error.message : error) };
    }
  }

  return validateSingleSelectCommitPayload;
});

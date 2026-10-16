define([
  "../config/actions.js",
  "./selectStartupSichtDefault.js",
  "./resolveDelegatedSichtInstanceId.js",
  "./dispatchSingleSelectOwnerSelection.js",
  "./buildSichtOperationId.js",
  "./readSingleSelectInventoryGeneration.js"
], function (
  _actions,
  _selectStartupSichtDefault,
  _resolveDelegatedSichtInstanceId,
  _dispatchSingleSelectOwnerSelection,
  _buildSichtOperationId,
  _readInventoryGeneration
) {
  "use strict";

  function readSichtState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
  }

  function readSkipReason(_state) {
    var displayValue;
    if (!_state) {
      return "noState";
    }
    if (_state.meta && _state.meta.startupDefaultCommitted === true) {
      return "startupDefaultCommitted";
    }
    if (_state.meta && _state.meta.startupDefaultInProgress === true) {
      return "startupDefaultInProgress";
    }
    displayValue =
      _state.currentSelection && _state.currentSelection.displayValue != null
        ? String(_state.currentSelection.displayValue).trim()
        : "";
    if (displayValue !== "") {
      return "currentSelectionAlreadySet";
    }
    return null;
  }

  function readFirstDiagnosticMessage(_result) {
    return _result && Array.isArray(_result.diagnostics) && _result.diagnostics[0]
      ? _result.diagnostics[0].message
      : "singleSelect owner-selection delegation failed";
  }

  // Startup default no longer writes Cognos directly; it delegates to the
  // certified singleSelect/applyOwnerSelection action and waits for the
  // confirmed sicht/singleSelectCommitted callback (contract §6).
  async function commitStartupSichtDefault(_KDB, _dispatchInternal, _byOption) {
    var state = readSichtState(_KDB);
    var skipReason = readSkipReason(state);
    var candidate;
    var filterInstanceId;
    var inventoryGeneration;
    var result;
    if (skipReason) {
      return { ok: false, reason: "skipped", skipReason: skipReason };
    }
    candidate = _selectStartupSichtDefault(_KDB, _byOption);
    if (candidate.ok !== true) {
      return candidate;
    }
    inventoryGeneration = _readInventoryGeneration(_KDB);
    if (inventoryGeneration == null || !isFinite(Number(inventoryGeneration))) {
      return { ok: false, reason: "inventoryNotReady" };
    }
    _dispatchInternal({
      type: _actions.STARTUP_DEFAULT_IN_PROGRESS,
      payload: { startedAt: Date.now() }
    });
    filterInstanceId = _resolveDelegatedSichtInstanceId(_KDB);
    if (!filterInstanceId) {
      _dispatchInternal({
        type: _actions.STARTUP_DEFAULT_FAILED,
        payload: {
          errorCode: "SICHT_STARTUP_DEFAULT_FAILED",
          errorMessage: "no unique live global Sicht instance available"
        }
      });
      return { ok: false, reason: "startupInstanceUnresolved" };
    }
    try {
      result = await _dispatchSingleSelectOwnerSelection(_KDB, {
        filterInstanceId: filterInstanceId,
        operationId: _buildSichtOperationId("startup"),
        selection: candidate.selection,
        source: "sichtStartup",
        inventoryGeneration: inventoryGeneration
      });
      if (!result || result.ok !== true) {
        throw new Error(readFirstDiagnosticMessage(result));
      }
      return {
        ok: true,
        degraded: result.degraded === true,
        diagnostics: result.diagnostics || [],
        selection: candidate.selection,
        reason: candidate.reason
      };
    } catch (error) {
      console.error("[sicht.startup] commit failed", error);
      _dispatchInternal({
        type: _actions.STARTUP_DEFAULT_FAILED,
        payload: {
          errorCode: "SICHT_STARTUP_DEFAULT_FAILED",
          errorMessage: String(error.message || error)
        }
      });
      return { ok: false, reason: "startupCommitFailed" };
    }
  }

  return commitStartupSichtDefault;
});

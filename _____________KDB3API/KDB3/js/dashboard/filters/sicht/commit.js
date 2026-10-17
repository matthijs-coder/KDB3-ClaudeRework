define([
  "./config.js",
  "./state.js",
  "./state/selectors.js",
  "./operations.js",
  "./validation.js",
  "./history.js",
  "../dienststelle/selectors.js",
  "../specialSingleSelect/state.js",
  "../../../core/utils/kit/history.js"
], function (
  _config, _state, _selectors, _operations, _validation, _history, _dienststelleSelectors, _specialState, _kitHistory
) {
  "use strict";

  var actions = _state.actions;

  function rejectCommit(_dispatchInternal, _code, _message) {
    dispatchError(_dispatchInternal, _code, _message);
    return { ok: false, code: _code, message: _message };
  }

  // Ack for an operationId that was already claimed: another instance is a rejection, the same
  // instance is acknowledged as in flight or stale.
  function readDuplicateCommitAck(_dispatchInternal, _opClaim, _payload) {
    if (_opClaim.entry.filterInstanceId &&
      _opClaim.entry.filterInstanceId !== _payload.filterInstanceId) {
      return rejectCommit(
        _dispatchInternal,
        "SICHT_INSTANCE_INVALID",
        "operationId was reused for another Sicht instance"
      );
    }
    return {
      ok: true,
      code: _opClaim.isInFlight
        ? "SICHT_COMMIT_IN_FLIGHT" : "SICHT_COMMIT_STALE",
      message: _opClaim.isInFlight
        ? "delegated operationId is already committing"
        : "duplicate delegated operationId ignored"
    };
  }

  function buildCommitInput(_payload, _flags, _validation) {
    return {
      filterInstanceId: String(_payload.filterInstanceId),
      selection: _validation.selection,
      timestamp: _payload.timestamp != null
        ? _payload.timestamp
        : (_payload.observedAt != null ? _payload.observedAt : Date.now()),
      isStartupDefault: _flags.isStartupDefault,
      isHistoryReplay: _flags.isHistoryReplay,
      isParameterClear: _validation.isClear === true,
      skipHistory: _payload.skipHistory === true,
      skipDownstreamVisibility: _flags.skipDownstreamVisibility
    };
  }

  function buildCommitAck(_commitResult, _operationId, _settled) {
    var diagnostics = (_commitResult.diagnostics || []).slice();
    if (!_operationId) {
      diagnostics.push({
        code: "SICHT_OPERATION_ID_COMPATIBILITY",
        message: "interactive commit accepted without operationId"
      });
    }
    if (!_settled) {
      diagnostics.push({
        code: "SICHT_OPERATION_SETTLE_FAILED",
        message: "operationId could not be marked committed"
      });
    }
    return {
      ok: true,
      degraded: _commitResult.degraded === true ||
        !_settled || !_operationId,
      diagnostics: diagnostics
    };
  }

  // Sole entry point for confirmed singleSelect commits, whether delivered from
  // an interactive popup confirm or from a delegated applyOwnerSelection
  // (startup/restore/historyReplay). Returns a structured ack singleSelect awaits.
  async function applySingleSelectCommit(_KDB, _runtime, _dispatchInternal, _payload) {
    try {
      var payload = _payload || {};
      var operationId = payload.operationId ? String(payload.operationId) : "";
      var opClaim = _operations.inspectOperation(_runtime, operationId);
      if (!operationId && _validation.isDelegatedCommitSource(payload.source)) {
        return rejectCommit(
          _dispatchInternal,
          "SICHT_OPERATION_ID_INVALID",
          "delegated singleSelect commit requires operationId"
        );
      }
      if (opClaim.isDuplicate === true) {
        return readDuplicateCommitAck(_dispatchInternal, opClaim, payload);
      }
      var validation = _validation.validateSingleSelectCommitPayload(_KDB, payload, opClaim.entry);
      if (validation.ok !== true) {
        return rejectCommit(_dispatchInternal, validation.code, validation.message);
      }
      if (operationId &&
        !_operations.beginOperationCommit(_runtime, payload)) {
        return {
          ok: false,
          code: "SICHT_OPERATION_CLAIM_FAILED",
          message: "operationId could not enter commit state"
        };
      }
      var flags = mapCommitSourceFlags(payload.source);
      var commitResult = await commitConfirmedSicht(
        _KDB,
        _dispatchInternal,
        buildCommitInput(payload, flags, validation)
      );
      var settled = !operationId || _operations.markOperationCommitted(
        _runtime,
        operationId,
        String(payload.filterInstanceId)
      );
      return buildCommitAck(commitResult, operationId, settled);
    } catch (error) {
      _operations.abandonOperation(
        _runtime,
        _payload && _payload.operationId
      );
      console.error("[sicht.applySingleSelectCommit] failed", error);
      return rejectCommit(
        _dispatchInternal,
        "SICHT_COMMIT_FAILED",
        String(error && error.message ? error.message : error)
      );
    }
  }

  function mapCommitSourceFlags(_source) {
    return Object.assign({}, _validation.isDelegatedCommitSource(_source)
      ? _config.COMMIT_SOURCE_FLAGS[_source]
      : _config.INTERACTIVE_COMMIT_FLAGS);
  }

  function dispatchError(_dispatchInternal, _code, _message) {
    _dispatchInternal({
      type: actions.ERROR,
      payload: {
        errorCode: _code,
        errorMessage: _message
      }
    });
  }

  async function commitConfirmedSicht(_KDB, _dispatchInternal, _payload) {
    var isStartupDefault = _payload && _payload.isStartupDefault === true;
    var isHistoryReplay = _payload && _payload.isHistoryReplay === true;
    var skipHistory = _payload && _payload.skipHistory === true;
    var skipDownstream = _payload && _payload.skipDownstreamVisibility === true;
    var nextSelection = normalizeSelection(_payload);
    var sichtState = _selectors.readSichtState(_KDB) || {};
    var previousSelection = readPreviousSelection(sichtState);
    var filterInstanceId = _payload && _payload.filterInstanceId
      ? String(_payload.filterInstanceId)
      : (sichtState.activeFilterInstanceId || null);
    var historyStep = null;
    var previousDependencies = null;
    var identity = null;
    var timestamp = _payload && _payload.timestamp != null ? _payload.timestamp : Date.now();
    var shouldPushHistory = !isStartupDefault && !isHistoryReplay && !skipHistory;
    var didCommit = false;
    var diagnostics = [];

    try {
      if (shouldPushHistory) {
        previousDependencies = _history.readDependencySnapshots(_KDB);
        identity = _history.readSichtInstanceIdentity(_KDB, filterInstanceId);
      }
      _dispatchInternal({
        type: actions.SINGLE_SELECT_COMMITTED,
        payload: {
          selection: nextSelection,
          timestamp: timestamp,
          historyStep: null,
          isStartupDefault: isStartupDefault,
          isParameterClear: _payload && _payload.isParameterClear === true,
          filterInstanceId: filterInstanceId
        }
      });
      didCommit = true;
      if (!skipDownstream) {
        appendDiagnostic(
          diagnostics,
          await notifySpecialSingleSelect(_KDB, nextSelection)
        );
        appendDiagnostic(
          diagnostics,
          await notifyDienststelle(_KDB, nextSelection, {
            isStartupDefault: isStartupDefault,
            isHistoryReplay: isHistoryReplay,
            timestamp: timestamp
          })
        );
      }
      if (shouldPushHistory) {
        historyStep = _history.buildCommittedStep(
          previousSelection,
          nextSelection,
          previousDependencies,
          _history.readDependencySnapshots(_KDB),
          identity
        );
        _dispatchInternal({
          type: actions.HISTORY_STEP_FINALIZED,
          payload: { historyStep: historyStep }
        });
        _kitHistory.pushHistoryStep(_KDB, historyStep, {
          isHistoryReplay: isHistoryReplay,
          skipHistory: skipHistory
        });
      }
      return {
        ok: true,
        degraded: diagnostics.length > 0,
        diagnostics: diagnostics
      };
    } catch (error) {
      if (!didCommit) {
        throw error;
      }
      console.error("[sicht.commitConfirmedSicht] post-commit failed", error);
      return {
        ok: true,
        degraded: true,
        diagnostics: diagnostics.concat([{
          code: "SICHT_POST_COMMIT_FAILED",
          message: String(error && error.message ? error.message : error)
        }])
      };
    }
  }

  function normalizeSelection(_payload) {
    var selection = (_payload && _payload.selection) || {};
    return {
      displayValue: selection.displayValue != null ? String(selection.displayValue) : "",
      useValue: selection.useValue != null ? String(selection.useValue) : "",
      displaySource: selection.displaySource != null ? String(selection.displaySource) : "unknown"
    };
  }

  function readPreviousSelection(_sichtState) {
    var current = _sichtState.currentSelection;
    if (!current) {
      return { displayValue: "", useValue: "" };
    }
    return {
      displayValue: current.displayValue || "",
      useValue: current.useValue || "",
      displaySource: current.displaySource || "unknown"
    };
  }

  function appendDiagnostic(_diagnostics, _result) {
    if (_result && _result.ok === false) {
      _diagnostics.push({ code: _result.code, message: _result.message });
    }
  }

  async function notifyDienststelle(_KDB, _selection, _payload) {
    try {
      var payload = _payload || {};
      var api = _KDB && _KDB.api ? _KDB.api.dienststelle : null;
      if (payload.isHistoryReplay === true ||
        !api) {
        return { ok: true, skipped: true };
      }
      await Promise.resolve(api.dispatch({
        type: _dienststelleSelectors.actionTypes.SICHT_CHANGED,
        payload: {
          activeSichtValue: _selection.displayValue,
          selection: {
            displayValue: _selection.displayValue,
            useValue: _selection.useValue
          },
          source: payload.isStartupDefault === true ? "startup" : "user",
          observedAt: payload.timestamp
        }
      }));
      return { ok: true };
    } catch (error) {
      console.error("[sicht.notifyDienststelle] failed", error);
      return {
        ok: false,
        code: "SICHT_DOWNSTREAM_DIENSTSTELLE_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  async function notifySpecialSingleSelect(_KDB, _selection) {
    try {
      var api = _KDB && _KDB.api ? _KDB.api.specialSingleSelect : null;
      if (!api || !_selection) {
        return { ok: true, skipped: true };
      }
      await Promise.resolve(api.dispatch({
        type: _specialState.actions.SICHT_CHANGED,
        payload: { activeSichtValue: _selection.displayValue }
      }));
      return { ok: true };
    } catch (error) {
      console.error("[sicht.notifySpecialSingleSelect] failed", error);
      return {
        ok: false,
        code: "SICHT_DOWNSTREAM_SPECIAL_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  return {
    applySingleSelectCommit: applySingleSelectCommit,
    mapCommitSourceFlags: mapCommitSourceFlags,
    notifySpecialSingleSelect: notifySpecialSingleSelect
  };
});

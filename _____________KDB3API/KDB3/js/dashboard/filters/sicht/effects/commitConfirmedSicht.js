define([
  "../config/actions.js",
  "../history/buildCommittedStep.js",
  "../history/readDependencySnapshots.js",
  "../history/readSichtInstanceIdentity.js",
  "./notifySpecialSingleSelect.js",
  "./notifyDienststelle.js"
], function (
  _actions,
  _buildCommittedStep,
  _readDependencySnapshots,
  _readSichtInstanceIdentity,
  _notifySpecialSingleSelect,
  _notifyDienststelle
) {
  "use strict";

  function normalizeSelection(_payload) {
    var selection = (_payload && _payload.selection) || {};
    return {
      displayValue: selection.displayValue != null ? String(selection.displayValue) : "",
      useValue: selection.useValue != null ? String(selection.useValue) : "",
      displaySource: selection.displaySource != null ? String(selection.displaySource) : "unknown"
    };
  }

  function readPreviousSelection(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    if (!state || !state.currentSelection) {
      return { displayValue: "", useValue: "" };
    }
    return {
      displayValue: state.currentSelection.displayValue || "",
      useValue: state.currentSelection.useValue || "",
      displaySource: state.currentSelection.displaySource || "unknown"
    };
  }

  function readActiveFilterInstanceId(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.sicht : null;
    return state && state.activeFilterInstanceId ? state.activeFilterInstanceId : null;
  }

  function appendDiagnostic(_diagnostics, _result) {
    if (_result && _result.ok === false) {
      _diagnostics.push({ code: _result.code, message: _result.message });
    }
  }

  async function commitConfirmedSicht(_KDB, _dispatchInternal, _payload) {
    var isStartupDefault = _payload && _payload.isStartupDefault === true;
    var isHistoryReplay = _payload && _payload.isHistoryReplay === true;
    var skipHistory = _payload && _payload.skipHistory === true;
    var skipDownstream = _payload && _payload.skipDownstreamVisibility === true;
    var nextSelection = normalizeSelection(_payload);
    var previousSelection = readPreviousSelection(_KDB);
    var filterInstanceId = _payload && _payload.filterInstanceId
      ? String(_payload.filterInstanceId)
      : readActiveFilterInstanceId(_KDB);
    var historyStep = null;
    var previousDependencies = null;
    var identity = null;
    var timestamp = _payload && _payload.timestamp != null ? _payload.timestamp : Date.now();
    var history = _KDB && _KDB.services ? _KDB.services.history : null;
    var shouldPushHistory = !isStartupDefault && !isHistoryReplay && !skipHistory;
    var didCommit = false;
    var diagnostics = [];

    try {
      if (shouldPushHistory) {
        previousDependencies = _readDependencySnapshots(_KDB);
        identity = _readSichtInstanceIdentity(_KDB, filterInstanceId);
      }
      _dispatchInternal({
        type: _actions.SINGLE_SELECT_COMMITTED,
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
          await _notifySpecialSingleSelect(_KDB, nextSelection)
        );
        appendDiagnostic(
          diagnostics,
          await _notifyDienststelle(_KDB, nextSelection, {
            isStartupDefault: isStartupDefault,
            isHistoryReplay: isHistoryReplay,
            timestamp: timestamp
          })
        );
      }
      if (shouldPushHistory) {
        historyStep = _buildCommittedStep(
          previousSelection,
          nextSelection,
          previousDependencies,
          _readDependencySnapshots(_KDB),
          identity
        );
        _dispatchInternal({
          type: _actions.HISTORY_STEP_FINALIZED,
          payload: { historyStep: historyStep }
        });
      }
      if (shouldPushHistory && history &&
        typeof history.pushCommittedStep === "function" && historyStep) {
        try {
          await Promise.resolve(history.pushCommittedStep(historyStep));
        } catch (historyError) {
          console.error("[sicht.commitConfirmedSicht] history push failed", historyError);
          diagnostics.push({
            code: "SICHT_HISTORY_PUSH_FAILED",
            message: String(historyError && historyError.message
              ? historyError.message : historyError)
          });
        }
      }
      return {
        ok: true,
        degraded: diagnostics.length > 0,
        diagnostics: diagnostics
      };
    } catch (error) {
      console.error("[sicht.commitConfirmedSicht] failed", error);
      if (didCommit) {
        return {
          ok: true,
          degraded: true,
          diagnostics: diagnostics.concat([{
            code: "SICHT_POST_COMMIT_FAILED",
            message: String(error && error.message ? error.message : error)
          }])
        };
      }
      throw error;
    }
  }

  return commitConfirmedSicht;
});

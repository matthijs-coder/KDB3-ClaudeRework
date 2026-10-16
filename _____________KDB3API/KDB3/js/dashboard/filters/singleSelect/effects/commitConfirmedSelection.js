define([
  "./executeConfirmedCommit.js",
  "../state/selectionState.js",
  "./restorePreviousConfirmedSelection.js",
  "./requestFilterDockPopupAction.js",
  "./finalizeConfirmedCommit.js",
  "./setCommitUiState.js",
  "./lookupLiveFilterState.js",
  "../runtime.js"
], function (
  _executeConfirmedCommit,
  _selectionState,
  _restorePreviousConfirmedSelection,
  _requestFilterDockPopupAction,
  _finalizeConfirmedCommit,
  _setCommitUiState,
  _lookupLiveFilterState,
  _singleSelectRuntime
) {
  "use strict";

  var ROLLBACK_UNVERIFIED_CODE = "SINGLE_SELECT_HOST_ROLLBACK_UNVERIFIED";

  function restoreOrMarkUncertain(_KDB, _handoff, _filterState, _filterRef, _previousConfirmedSelection, _previousValues) {
    return _restorePreviousConfirmedSelection(
      _KDB,
      _filterRef,
      _previousConfirmedSelection,
      _previousValues
    ).then(function (_rollbackOk) {
      var liveState = _lookupLiveFilterState(_KDB, _handoff, _filterState);
      if (_rollbackOk === true) {
        liveState.currentSelection = Object.assign({}, _previousConfirmedSelection);
        liveState.backupSelection = Object.assign({}, _previousConfirmedSelection);
        liveState.pendingSelection = { displayValue: _previousConfirmedSelection.displayValue };
        return;
      }
      _KDB.state.filters.singleSelect.errorCode = ROLLBACK_UNVERIFIED_CODE;
      _KDB.state.filters.singleSelect.errorMessage =
        "commit failed and rollback could not be verified; owner state remains uncertain";
    }).catch(function (_rollbackError) {
      _KDB.state.filters.singleSelect.errorCode = ROLLBACK_UNVERIFIED_CODE;
      _KDB.state.filters.singleSelect.errorMessage =
        "commit failed and rollback threw: " +
        String(_rollbackError && _rollbackError.message ? _rollbackError.message : _rollbackError);
    });
  }

  async function __controller(_KDB, _runtime, _handoffContext, _filterState, _options) {
    if (!_KDB || !_handoffContext || !_filterState) {
      return false;
    }
    var options = _options || {};
    var nextSelectionLabel = _selectionState.getPendingDisplayValue(_filterState.pendingSelection);
    var previousConfirmedSelection = _selectionState.normalizeConfirmedSelection(_filterState.backupSelection);
    var singleSelectRoot = _KDB.state.filters.singleSelect;
    var filterRef = null;
    var commitSucceeded = false;
    var liveState = _filterState;
    var instanceId = _handoffContext.filterInstanceId;
    liveState = _lookupLiveFilterState(_KDB, _handoffContext, _filterState);
    if (options.signal && options.signal.aborted === true) {
      return false;
    }
    if (_singleSelectRuntime.isStaleInteraction(liveState, options.interactionSequence)) {
      return false;
    }
    liveState.isCommitInProgress = true;
    _singleSelectRuntime.inFlight.begin(_runtime, instanceId);
    _setCommitUiState(_KDB, _runtime, true);
    try {
      var executed = await _executeConfirmedCommit(
        _KDB, _runtime, _handoffContext, nextSelectionLabel
      );
      filterRef = executed.filterRef;
      liveState = _lookupLiveFilterState(_KDB, _handoffContext, liveState);
      await _finalizeConfirmedCommit(
        _KDB, _handoffContext, liveState, previousConfirmedSelection, executed.selection
      );
      singleSelectRoot.errorCode = null;
      singleSelectRoot.errorMessage = null;
      commitSucceeded = true;
      return true;
    } catch (error) {
      singleSelectRoot.errorCode = error && error.code || "SINGLE_SELECT_HOST_WRITE_FAILED";
      singleSelectRoot.errorMessage = String(error && error.message ? error.message : error);
      console.error("[singleSelect.commitConfirmedSelection] commit failed", {
        filterInstanceId: instanceId,
        errorCode: singleSelectRoot.errorCode
      }, error);
      filterRef = filterRef || (error && error.filterRef);
      liveState = _lookupLiveFilterState(_KDB, _handoffContext, liveState);
      await restoreOrMarkUncertain(
        _KDB,
        _handoffContext,
        liveState,
        filterRef,
        previousConfirmedSelection,
        error && error.previousValues
      );
      return false;
    } finally {
      if (commitSucceeded === true && !(options.signal && options.signal.aborted === true)) {
        _requestFilterDockPopupAction.requestClosePopup(_KDB, options);
      }
      liveState = _lookupLiveFilterState(_KDB, _handoffContext, liveState);
      liveState.isCommitInProgress = false;
      _singleSelectRuntime.inFlight.end(_runtime, instanceId);
      _setCommitUiState(_KDB, _runtime, false);
    }
  }

  return __controller;
});

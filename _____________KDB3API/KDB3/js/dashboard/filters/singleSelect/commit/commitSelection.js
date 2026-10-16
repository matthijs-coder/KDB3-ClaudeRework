define([
  "../config.js",
  "../history.js",
  "../hostFilterIo.js",
  "../runtime.js",
  "../dockHandoff/popup.js",
  "../state/instance.js",
  "../state/selection.js",
  "./ownerNotify.js",
  "./tableValues.js",
  "../../../../core/utils/kit/errors.js",
  "../../../../core/events/filters.js"
], function (
  _config,
  _history,
  _hostFilterIo,
  _singleSelectRuntime,
  _popup,
  _instance,
  _selectionState,
  _ownerNotify,
  _tableValues,
  _kitErrors,
  _filterEvents
) {
  "use strict";

  var codes = _config.errorCodes;
  var ALLE = _config.ALLE;

  async function executeConfirmedCommit(_KDB, _runtime, _handoff, _displayValue) {
    var filtersFacet;
    var filterRef;
    var previousValues;
    try {
      filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, _runtime);
      filterRef = _hostFilterIo.resolveFilterRef(_KDB, _runtime, _handoff);
      if (!_hostFilterIo.isWriteReady(filtersFacet) || !filterRef) {
        throw _kitErrors.codedError(codes.HOST_WRITE_FAILED, "filter host writer unavailable");
      }
      previousValues = _hostFilterIo.readValues(filtersFacet, filterRef);
      var selectedValue;
      if (_displayValue === ALLE) {
        selectedValue = { d: ALLE, u: "" };
        if (!(await _hostFilterIo.writeValues(filtersFacet, filterRef, []))) {
          throw _kitErrors.codedError(codes.HOST_WRITE_FAILED, "filter host writer unavailable");
        }
      } else {
        var resolved = await _tableValues.resolveFilterValueFromTable(
          _KDB,
          _handoff.filterLabel,
          _displayValue,
          _handoff
        );
        if (!resolved || resolved.ok !== true) {
          throw _kitErrors.codedError(
            codes.HOST_WRITE_FAILED,
            "selection pair resolution failed: " + (resolved && resolved.errorCode || "unknown")
          );
        }
        selectedValue = resolved.selectedValue;
        if (!(await _hostFilterIo.writeValues(filtersFacet, filterRef, [selectedValue]))) {
          throw _kitErrors.codedError(codes.HOST_WRITE_FAILED, "filter host writer unavailable");
        }
      }
      var verified = _hostFilterIo.verifySelection(filtersFacet, filterRef, {
        displayValue: selectedValue.d,
        useValue: selectedValue.u
      });
      if (verified.ok !== true) {
        throw _kitErrors.codedError(codes.COMMIT_VERIFICATION_MISMATCH, "host reread did not confirm display/use pair");
      }
      return {
        filterRef: filterRef,
        selection: {
          displayValue: _displayValue === ALLE ? ALLE : verified.observed.d,
          useValue: _displayValue === ALLE ? "" : verified.observed.u,
          displaySource: _displayValue === ALLE ? "policy" : "cognos"
        }
      };
    } catch (error) {
      // commitConfirmedSelection needs the ref and prior host values to roll back.
      if (filterRef) {
        error.filterRef = filterRef;
      }
      if (typeof previousValues !== "undefined") {
        error.previousValues = previousValues;
      }
      throw error;
    }
  }

  function startTopNWave(_KDB, _handoff) {
    var handoff = _handoff || {};
    if (handoff.filterType === "sicht") {
      return;
    }
    if (handoff.filterScope !== "global" && !handoff.tabId) {
      return;
    }
    _filterEvents.emitConfirmed(_KDB, {
      filterType: handoff.filterType,
      scopeType: handoff.filterScope === "global" ? "global" : "pageContext",
      tabId: handoff.tabId || null
    });
  }

  async function finalizeConfirmedCommit(_KDB, _handoff, _filterState, _previous, _next) {
    var notifyResult = await _ownerNotify.notifyOwnerCommit(_KDB, _handoff, _next);
    if (!notifyResult.ok) {
      throw _kitErrors.codedError(
        notifyResult.code || codes.OWNER_SELECTION_INVALID,
        notifyResult.message || "owner notification failed"
      );
    }
    // Re-lookup after the owner-sync await (specialSingleSelect can wait on
    // the host). applyConfirmedState must hit the live instance, not the
    // object captured before that wait (contract section 11, M4).
    _selectionState.applyConfirmedState(
      _instance.lookupLiveFilterState(_KDB, _handoff, _filterState),
      _KDB.state.filters.singleSelect,
      _next
    );
    _history.pushCommittedSelectionStep(_KDB, _handoff, _previous, _next);
    startTopNWave(_KDB, _handoff);
    return true;
  }

  function restoreOrMarkUncertain(_KDB, _handoff, _filterState, _filterRef, _previousConfirmedSelection, _previousValues) {
    return _hostFilterIo.restorePreviousSelection(
      _KDB,
      _filterRef,
      _previousConfirmedSelection,
      _previousValues
    ).then(function (_rollbackOk) {
      var liveState = _instance.lookupLiveFilterState(_KDB, _handoff, _filterState);
      if (_rollbackOk === true) {
        liveState.currentSelection = Object.assign({}, _previousConfirmedSelection);
        liveState.backupSelection = Object.assign({}, _previousConfirmedSelection);
        liveState.pendingSelection = { displayValue: _previousConfirmedSelection.displayValue };
        return;
      }
      _KDB.state.filters.singleSelect.errorCode = codes.HOST_ROLLBACK_UNVERIFIED;
      _KDB.state.filters.singleSelect.errorMessage =
        "commit failed and rollback could not be verified; owner state remains uncertain";
    }).catch(function (_rollbackError) {
      _KDB.state.filters.singleSelect.errorCode = codes.HOST_ROLLBACK_UNVERIFIED;
      _KDB.state.filters.singleSelect.errorMessage = "commit failed and rollback threw: " +
        String(_rollbackError && _rollbackError.message ? _rollbackError.message : _rollbackError);
    });
  }

  // User commit boundary: begin inFlight, write (Alle -> []), verify, finalize
  // (owner notify, history, TopN), roll back or flag the owner state as uncertain.
  async function commitConfirmedSelection(_KDB, _runtime, _handoffContext, _filterState, _options) {
    if (!_KDB || !_handoffContext || !_filterState) {
      return false;
    }
    var options = _options || {};
    var nextSelectionLabel = _selectionState.getPendingDisplayValue(_filterState.pendingSelection);
    var previousConfirmedSelection = _selectionState.normalizeConfirmedSelection(_filterState.backupSelection);
    var singleSelectRoot = _KDB.state.filters.singleSelect;
    var filterRef = null;
    var commitSucceeded = false;
    var instanceId = _handoffContext.filterInstanceId;
    var liveState = _instance.lookupLiveFilterState(_KDB, _handoffContext, _filterState);
    if (options.signal && options.signal.aborted === true) {
      return false;
    }
    if (_singleSelectRuntime.isStaleInteraction(liveState, options.interactionSequence)) {
      return false;
    }
    liveState.isCommitInProgress = true;
    _singleSelectRuntime.inFlight.begin(_runtime, instanceId);
    _popup.setCommitUiState(_runtime, true);
    try {
      var executed = await executeConfirmedCommit(_KDB, _runtime, _handoffContext, nextSelectionLabel);
      filterRef = executed.filterRef;
      liveState = _instance.lookupLiveFilterState(_KDB, _handoffContext, liveState);
      await finalizeConfirmedCommit(_KDB, _handoffContext, liveState, previousConfirmedSelection, executed.selection);
      singleSelectRoot.errorCode = null;
      singleSelectRoot.errorMessage = null;
      commitSucceeded = true;
      return true;
    } catch (error) {
      singleSelectRoot.errorCode = error && error.code || codes.HOST_WRITE_FAILED;
      singleSelectRoot.errorMessage = String(error && error.message ? error.message : error);
      console.error("[singleSelect.commitConfirmedSelection] commit failed", {
        filterInstanceId: instanceId,
        errorCode: singleSelectRoot.errorCode
      }, error);
      filterRef = filterRef || (error && error.filterRef);
      liveState = _instance.lookupLiveFilterState(_KDB, _handoffContext, liveState);
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
        _popup.requestClosePopup(_KDB, options);
      }
      liveState = _instance.lookupLiveFilterState(_KDB, _handoffContext, liveState);
      liveState.isCommitInProgress = false;
      _singleSelectRuntime.inFlight.end(_runtime, instanceId);
      _popup.setCommitUiState(_runtime, false);
    }
  }

  return {
    commitConfirmedSelection: commitConfirmedSelection
  };
});

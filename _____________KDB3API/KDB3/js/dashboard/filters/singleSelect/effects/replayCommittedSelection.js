define([
  "./replayCommittedSelectionWrites.js",
  "./restorePreviousConfirmedSelection.js",
  "./commitSelectionState.js",
  "../state/selectionState.js",
  "../config.js",
  "../history/notifySpecialOwnerForReplay.js",
  "./resolveFilterRef.js",
  "./readFiltersFacet.js",
  "./hostFilterWrite.js"
], function (
  _writes, _restorePrevious, _commitSelectionState, _selectionState, _config, _notifySpecialOwner,
  _resolveFilterRef, _readFiltersFacet, _hostWrite
) {
  "use strict";

  // Applies an already-resolved history replay target to the live host and
  // commits it into owner state. Writes/rereads exclusively through the
  // existing owner effects; no direct state mutation and no foreign API calls
  // beyond the specialSingleSelect public notification boundary.
  //
  // Amendment 2026-08-10: the previous host pair is snapshotted before the
  // write. If the owner record disappears/rekeys after a successful host
  // write, or the owner-state commit or the special-owner notification
  // subsequently fails, the handler performs a verified host rollback to the
  // snapshotted pair; an unverified rollback is its own failure
  // (ROLLBACK_FAILED) and never counts as success.

  function resolveFilterRef(_KDB, _runtime, _filterInstanceId) {
    return _resolveFilterRef.resolveFilterRef(_KDB, _runtime, { filterInstanceId: _filterInstanceId });
  }

  async function rollbackHost(_KDB, _filterRef, _previousSelection, _previousValues) {
    try {
      return await _restorePrevious(_KDB, _filterRef, _previousSelection, _previousValues) === true;
    } catch (error) {
      console.error("[singleSelect.replayCommittedSelection] rollback threw", error);
      return false;
    }
  }

  function buildFailure(_errorCode, _rollbackVerified) {
    return { ok: false, errorCode: _errorCode, rollbackFailed: _rollbackVerified === false };
  }

  async function replayCommittedSelection(_KDB, _record, _value) {
    var value = _value || {};
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.singleSelect : null;
    var singleSelectRoot = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    var filtersFacet = _readFiltersFacet(_KDB, runtime);
    var filterRef;
    var previousHostValues;
    var previousSelection;
    var priorFilterState;
    var filterState;
    var writeResult;
    var notifyResult;
    var rollbackVerified;

    if (!_record || !runtime || !singleSelectRoot || !_hostWrite.isWriteReady(filtersFacet)) {
      return { ok: false, errorCode: _config.historyReplayCodes.REPLAY_FAILED };
    }
    // `_record` is the resolver's published (projected) descriptor and does
    // not carry the raw `currentSelection` object; the pre-write snapshot for
    // rollback must come from the owner's own live state, not the projection.
    priorFilterState = singleSelectRoot.instancesById ? singleSelectRoot.instancesById[_record.filterInstanceId] : null;
    if (!priorFilterState || priorFilterState.selectionOwner !== "singleSelect") {
      return { ok: false, errorCode: _config.historyReplayCodes.INSTANCE_MISSING };
    }
    filterRef = resolveFilterRef(_KDB, runtime, _record.filterInstanceId);
    if (!filterRef) {
      return { ok: false, errorCode: _config.historyReplayCodes.INSTANCE_MISSING };
    }
    previousHostValues = _hostWrite.readValues(filtersFacet, filterRef);
    previousSelection = _selectionState.normalizeConfirmedSelection(priorFilterState.currentSelection);

    try {
      writeResult = await _writes.writeSelectionForReplay(
        _KDB, runtime, _record, value, filtersFacet, filterRef, previousHostValues
      );
    } catch (error) {
      console.error("[singleSelect.replayCommittedSelection] write threw", {
        filterInstanceId: _record.filterInstanceId
      }, error);
      writeResult = null;
    }
    if (!writeResult || writeResult.ok !== true) {
      rollbackVerified = await rollbackHost(_KDB, filterRef, previousSelection, previousHostValues);
      return buildFailure(_config.historyReplayCodes.REPLAY_FAILED, rollbackVerified);
    }

    filterState = singleSelectRoot.instancesById ? singleSelectRoot.instancesById[_record.filterInstanceId] : null;
    if (!filterState || filterState.selectionOwner !== "singleSelect") {
      rollbackVerified = await rollbackHost(_KDB, filterRef, previousSelection, previousHostValues);
      return buildFailure(_config.historyReplayCodes.INSTANCE_MISSING, rollbackVerified);
    }

    try {
      // Keep step displaySource on owner commit; createConfirmedSelection alone drops it.
      _commitSelectionState.applyConfirmedState(
        filterState, singleSelectRoot,
        _selectionState.normalizeConfirmedSelection({
          displayValue: value.displayValue,
          useValue: value.useValue,
          displaySource: value.displaySource
        })
      );
    } catch (error) {
      console.error("[singleSelect.replayCommittedSelection] owner commit failed", {
        filterInstanceId: _record.filterInstanceId
      }, error);
      rollbackVerified = await rollbackHost(_KDB, filterRef, previousSelection, previousHostValues);
      return buildFailure(_config.historyReplayCodes.REPLAY_FAILED, rollbackVerified);
    }

    notifyResult = await _notifySpecialOwner(_KDB, _record, value);
    if (!notifyResult || notifyResult.ok !== true) {
      _commitSelectionState.revertFilterState(filterState, previousSelection);
      rollbackVerified = await rollbackHost(_KDB, filterRef, previousSelection, previousHostValues);
      return buildFailure(_config.historyReplayCodes.OWNER_NOTIFY_FAILED, rollbackVerified);
    }

    singleSelectRoot.errorCode = null;
    singleSelectRoot.errorMessage = null;
    return { ok: true };
  }

  return replayCommittedSelection;
});

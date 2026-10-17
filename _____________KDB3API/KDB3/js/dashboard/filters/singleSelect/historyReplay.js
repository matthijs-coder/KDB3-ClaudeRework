define([
  "./config.js",
  "./history.js",
  "./hostFilterIo.js",
  "./runtime.js",
  "./state/selection.js",
  "./state/selectors.js",
  "./commit/ownerNotify.js",
  "../../../core/utils/normalizeCognosScopeId.js",
  "../../../core/utils/kit/history.js",
  "../../../core/events/filters.js"
], function (
  _config,
  _history,
  _hostFilterIo,
  _singleSelectRuntime,
  _selectionState,
  _selectors,
  _ownerNotify,
  _normalizeScopeId,
  _kitHistory,
  _filterEvents
) {
  "use strict";

  var replayCodes = _config.historyReplayCodes;

  // Resolution per historyService-filterInstanceIdentity-contractdelta.md §5:
  // exact filterInstanceId + tuple verify, then remount-fallback tuple search
  // across the live inventory. Legacy descriptors (no filterInstanceId/scopeId)
  // fall back to itemId/label-only matching per §6, but new-shape descriptors
  // never resolve on label alone.
  //
  // Amendment 2026-08-10: a stale inventory is refreshed only through the
  // canonical `reason: "historyReplay"` reconcile; the caller requires the
  // owner dispatch API and inspects the awaited result (`ok`, `degraded`) and
  // the post-reconcile freshness before ever attempting resolution. A missing
  // dispatch API, a failed/degraded/still-stale reconcile fails the replay
  // closed with no resolution and no write against the stale inventory.

  async function ensureFreshInventory(_KDB) {
    var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    var api = _KDB && _KDB.api ? _KDB.api.singleSelect : null;
    var result;
    if (root && root.inventory && root.inventory.freshness === "fresh") {
      return { ok: true };
    }
    if (!api) {
      return { ok: false, errorCode: replayCodes.REPLAY_FAILED };
    }
    try {
      result = await api.dispatch({
        type: _config.actions.RECONCILE_FILTER_INSTANCES,
        payload: { reason: "historyReplay" }
      });
    } catch (error) {
      console.error("[singleSelect.resolveHistoryTarget] historyReplay reconcile threw", error);
      return { ok: false, errorCode: replayCodes.REPLAY_FAILED };
    }
    root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!result || result.ok !== true || result.degraded === true ||
      !root || !root.inventory || root.inventory.freshness !== "fresh") {
      return { ok: false, errorCode: replayCodes.REPLAY_FAILED };
    }
    return { ok: true };
  }

  function isLiveSingleSelectRecord(_record) {
    return !!_record &&
      _record.selectionOwner === "singleSelect" &&
      _record.status === "active" &&
      _record.hostStatus === "present";
  }

  function scopeHintMatches(_record, _descriptor) {
    var hint = _descriptor.scopeHint;
    if (!hint || hint === "global" || hint === "pageContext") { return true; }
    return _normalizeScopeId(_record.scopeId) === _normalizeScopeId(hint) || String(_record.scopeId) === hint;
  }

  function tupleMatches(_record, _descriptor) {
    if (!isLiveSingleSelectRecord(_record)) { return false; }
    if (_record.scopeType !== _descriptor.scopeType) { return false; }
    if (_record.filterLabel !== _descriptor.filterLabel) { return false; }
    if (_descriptor.scopeId &&
      _normalizeScopeId(_record.scopeId) !== _normalizeScopeId(_descriptor.scopeId)) {
      return false;
    }
    if (!scopeHintMatches(_record, _descriptor)) { return false; }
    if (_descriptor.itemId != null && _record.itemId != null) {
      return _record.itemId === _descriptor.itemId;
    }
    if (_descriptor.semanticInstanceKey && _record.semanticInstanceKey) {
      return _record.semanticInstanceKey === _descriptor.semanticInstanceKey;
    }
    if (_descriptor.itemId != null || _descriptor.semanticInstanceKey) {
      // descriptor asserts an identity field this live candidate cannot confirm
      return false;
    }
    return _descriptor.isLegacy === true;
  }

  function findCandidates(_KDB, _descriptor) {
    return _selectors.readFilterInstances(_KDB, { scopeType: _descriptor.scopeType })
      .filter(function (_record) { return tupleMatches(_record, _descriptor); });
  }

  async function resolveHistoryTarget(_KDB, _descriptor) {
    var descriptor = _descriptor || {};
    var freshness;
    var exact;
    var candidates;
    try {
      freshness = await ensureFreshInventory(_KDB);
      if (!freshness.ok) {
        return { ok: false, errorCode: freshness.errorCode };
      }
      if (descriptor.filterInstanceId) {
        exact = _selectors.readFilterInstance(_KDB, descriptor.filterInstanceId);
        if (tupleMatches(exact, descriptor)) {
          return { ok: true, record: exact };
        }
      }
      candidates = findCandidates(_KDB, descriptor);
      if (candidates.length === 1) {
        return { ok: true, record: candidates[0] };
      }
      return {
        ok: false,
        errorCode: candidates.length > 1 ? replayCodes.INSTANCE_AMBIGUOUS : replayCodes.INSTANCE_MISSING
      };
    } catch (error) {
      console.error("[singleSelect.resolveHistoryTarget] failed", error);
      return { ok: false, errorCode: replayCodes.REPLAY_FAILED };
    }
  }

  // Special owner notification (historyService-filterInstanceIdentity-
  // contractdelta.md §5, amendment 2026-08-10): replaying a step that targets
  // a currently visible specialSingleSelect instance must await
  // `specialSingleSelect/userSelectionCommitted` with `source: "historyReplay"`
  // and `skipHistory: true` after the host commit; a regular (non-special)
  // instance performs no foreign owner notification. "Visible" is derived only
  // through the public `getState()`/`dispatch()` boundary (§9/§13).

  function findVisibleSpecialFilterId(_state, _filterLabel) {
    var byFilterId = _state && _state.byFilterId ? _state.byFilterId : {};
    var ids = Object.keys(byFilterId);
    var idx;
    for (idx = 0; idx < ids.length; idx += 1) {
      if (byFilterId[ids[idx]].filterLabel === _filterLabel && byFilterId[ids[idx]].isVisible === true) {
        return ids[idx];
      }
    }
    return null;
  }

  function resolveVisibleSpecialFilterId(_KDB, _filterLabel) {
    var api = _KDB && _KDB.api ? _KDB.api.specialSingleSelect : null;
    if (!api) { return null; }
    try {
      return findVisibleSpecialFilterId(api.getState(), _filterLabel);
    } catch (error) {
      console.error("[singleSelect.notifySpecialOwnerForReplay] getState failed", error);
      return null;
    }
  }

  async function notifySpecialOwnerForReplay(_KDB, _record, _value) {
    var filterId = resolveVisibleSpecialFilterId(_KDB, _record.filterLabel);
    var api;
    var ack;
    if (!filterId) {
      return { ok: true, applicable: false };
    }
    api = _KDB.api.specialSingleSelect;
    if (!api) {
      return { ok: false, applicable: true, errorCode: replayCodes.OWNER_NOTIFY_FAILED };
    }
    try {
      ack = await api.dispatch({
        type: _ownerNotify.ownerActions.specialCommitted,
        payload: {
          filterId: filterId,
          filterInstanceId: _record.filterInstanceId,
          filterLabel: _record.filterLabel,
          filterScope: _record.scopeType,
          selection: {
            displayValue: _value.displayValue,
            useValue: _value.useValue,
            displaySource: _value.displaySource || "cognos"
          },
          source: "historyReplay",
          skipHistory: true,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error("[singleSelect.notifySpecialOwnerForReplay] dispatch failed", error);
      return { ok: false, applicable: true, errorCode: replayCodes.OWNER_NOTIFY_FAILED };
    }
    if (_ownerNotify.isNegativeAck(ack)) {
      return { ok: false, applicable: true, errorCode: replayCodes.OWNER_NOTIFY_FAILED };
    }
    return { ok: true, applicable: true };
  }

  function buildValuesForWrite(_displayValue, _useValue, _displaySource) {
    var useValue = _useValue == null ? "" : String(_useValue);
    if (!useValue) {
      return [];
    }
    if (_displayValue === _config.ALLE) {
      return [];
    }
    if (_displayValue === null && _displaySource === "unavailable") {
      return [{ d: useValue, u: useValue }];
    }
    return [{ d: _displayValue, u: useValue }];
  }

  function isUnavailableReplay(_value) {
    return _value.displaySource === "unavailable" && _value.displayValue === null;
  }

  async function writeUnavailableReplay(_filtersFacet, _filterRef, _useValue, _previousHostValues) {
    var useValue = _useValue == null ? "" : String(_useValue);
    var previous = Array.isArray(_previousHostValues) ? _previousHostValues : [];
    var observed;
    try {
      if (!(await _hostFilterIo.writeValues(_filtersFacet, _filterRef, useValue ? [{ d: useValue, u: useValue }] : []))) {
        return { ok: false };
      }
      observed = _hostFilterIo.readValues(_filtersFacet, _filterRef);
      if (!useValue) {
        return { ok: Array.isArray(observed) && observed.length === 0 };
      }
      if (!Array.isArray(observed) || !observed[0] || String(observed[0].u || "") !== useValue) {
        await _hostFilterIo.writeValues(_filtersFacet, _filterRef, previous);
        return { ok: false };
      }
      return { ok: true };
    } catch (error) {
      try {
        await _hostFilterIo.writeValues(_filtersFacet, _filterRef, previous);
      } catch (rollbackError) {
        console.error("[singleSelect.replayCommittedSelection] unavailable rollback threw", rollbackError);
      }
      return { ok: false };
    }
  }

  async function writeSelectionForReplay(_KDB, _runtime, _record, _value, _filtersFacet, _filterRef, _previousHostValues) {
    if (isUnavailableReplay(_value) && _filtersFacet) {
      return await writeUnavailableReplay(_filtersFacet, _filterRef, _value.useValue, _previousHostValues);
    }
    return await _hostFilterIo.writeInstanceSelection(
      _KDB,
      _runtime,
      _record.filterInstanceId,
      buildValuesForWrite(_value.displayValue, _value.useValue, _value.displaySource)
    );
  }

  async function rollbackHost(_KDB, _filterRef, _previousSelection, _previousValues) {
    try {
      return await _hostFilterIo.restorePreviousSelection(_KDB, _filterRef, _previousSelection, _previousValues) === true;
    } catch (error) {
      console.error("[singleSelect.replayCommittedSelection] rollback threw", error);
      return false;
    }
  }

  function buildFailure(_errorCode, _rollbackVerified) {
    return { ok: false, errorCode: _errorCode, rollbackFailed: _rollbackVerified === false };
  }

  // Applies an already-resolved history replay target to the live host and
  // commits it into owner state.
  //
  // Amendment 2026-08-10: the previous host pair is snapshotted before the
  // write. If the owner record disappears/rekeys after a successful host
  // write, or the owner-state commit or the special-owner notification
  // subsequently fails, the handler performs a verified host rollback to the
  // snapshotted pair; an unverified rollback is its own failure
  // (ROLLBACK_FAILED) and never counts as success.
  async function replayCommittedSelection(_KDB, _record, _value) {
    var value = _value || {};
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.singleSelect : null;
    var singleSelectRoot = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, runtime);
    var filterRef;
    var previousHostValues;
    var previousSelection;
    var priorFilterState;
    var filterState;
    var writeResult;
    var notifyResult;
    var rollbackVerified;

    if (!_record || !runtime || !singleSelectRoot || !_hostFilterIo.isWriteReady(filtersFacet)) {
      return { ok: false, errorCode: replayCodes.REPLAY_FAILED };
    }
    // `_record` is the resolver's published (projected) descriptor and does
    // not carry the raw `currentSelection` object; the pre-write snapshot for
    // rollback must come from the owner's own live state, not the projection.
    priorFilterState = singleSelectRoot.instancesById ? singleSelectRoot.instancesById[_record.filterInstanceId] : null;
    if (!priorFilterState || priorFilterState.selectionOwner !== "singleSelect") {
      return { ok: false, errorCode: replayCodes.INSTANCE_MISSING };
    }
    filterRef = _hostFilterIo.resolveFilterRef(_KDB, runtime, { filterInstanceId: _record.filterInstanceId });
    if (!filterRef) {
      return { ok: false, errorCode: replayCodes.INSTANCE_MISSING };
    }
    previousHostValues = _hostFilterIo.readValues(filtersFacet, filterRef);
    previousSelection = _selectionState.normalizeConfirmedSelection(priorFilterState.currentSelection);

    try {
      writeResult = await writeSelectionForReplay(
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
      return buildFailure(replayCodes.REPLAY_FAILED, rollbackVerified);
    }

    filterState = singleSelectRoot.instancesById ? singleSelectRoot.instancesById[_record.filterInstanceId] : null;
    if (!filterState || filterState.selectionOwner !== "singleSelect") {
      rollbackVerified = await rollbackHost(_KDB, filterRef, previousSelection, previousHostValues);
      return buildFailure(replayCodes.INSTANCE_MISSING, rollbackVerified);
    }

    try {
      // Keep step displaySource on owner commit; createConfirmedSelection alone drops it.
      _selectionState.applyConfirmedState(
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
      return buildFailure(replayCodes.REPLAY_FAILED, rollbackVerified);
    }

    notifyResult = await notifySpecialOwnerForReplay(_KDB, _record, value);
    if (!notifyResult || notifyResult.ok !== true) {
      _selectionState.revertFilterState(filterState, previousSelection);
      rollbackVerified = await rollbackHost(_KDB, filterRef, previousSelection, previousHostValues);
      return buildFailure(replayCodes.OWNER_NOTIFY_FAILED, rollbackVerified);
    }

    singleSelectRoot.errorCode = null;
    singleSelectRoot.errorMessage = null;
    return { ok: true };
  }

  function emitFilterConfirmed(_KDB, _record) {
    if (_record.scopeType === "pageContext" && !_record.scopeId) {
      return;
    }
    _filterEvents.emitConfirmed(_KDB, {
      filterType: "singleSelect",
      scopeType: _record.scopeType,
      scopeId: _record.scopeId,
      columnId: _record && _record.itemId != null ? String(_record.itemId) : ""
    });
  }

  function reportFailure(_KDB, _filterInstanceId, _errorCode, _message) {
    _history.recordHistoryReplayDiagnostic(_KDB, _errorCode, _message, _filterInstanceId);
    return false;
  }

  // Validates the step shape, resolves the one live target instance, and
  // delegates the write/reread/commit/notify/rollback. Returns a boolean so a
  // failed replay never advances the historyService pointer (§5, last
  // paragraph). Every rejection path records a visible diagnostic on the
  // singleSelect owner state before returning false.
  async function applyHistoryReplay(_KDB, _payload) {
    var payload = _payload || {};
    var step = payload.step || null;
    var otherValue;
    var target;
    var other;
    var resolved;
    var result;

    if (!step || step.key !== "filter_singleSelect") {
      return false;
    }
    otherValue = payload.direction === "undo" ? step.new : step.old;
    target = _history.normalizeStepValue(payload.targetValue);
    other = otherValue != null ? _history.normalizeStepValue(otherValue) : null;
    if (!target || target.invalid === true || (other && other.invalid === true)) {
      return reportFailure(_KDB, null, replayCodes.STEP_INVALID, "history step failed identity/shape validation");
    }
    if (other && !_history.sameInstance(target, other)) {
      return reportFailure(
        _KDB, target.filterInstanceId, replayCodes.STEP_INVALID,
        "old/new step values reference different instances"
      );
    }
    if (target.displayValue === null && target.displaySource !== "unavailable") {
      return reportFailure(
        _KDB, target.filterInstanceId, replayCodes.STEP_INVALID,
        "history step failed identity/shape validation"
      );
    }

    resolved = await resolveHistoryTarget(_KDB, target);
    if (!resolved.ok) {
      return reportFailure(_KDB, target.filterInstanceId, resolved.errorCode, "target instance unresolved");
    }

    result = await replayCommittedSelection(_KDB, resolved.record, {
      displayValue: target.displayValue,
      useValue: target.useValue,
      displaySource: target.displaySource
    });
    if (!result || result.ok !== true) {
      if (result && result.rollbackFailed) {
        _history.recordHistoryReplayDiagnostic(
          _KDB, replayCodes.ROLLBACK_FAILED, "replay rollback could not be verified", resolved.record.filterInstanceId
        );
      }
      return reportFailure(
        _KDB, resolved.record.filterInstanceId, (result && result.errorCode) || replayCodes.REPLAY_FAILED,
        "replay apply failed"
      );
    }
    emitFilterConfirmed(_KDB, resolved.record);
    return true;
  }

  function createHistoryReplayHandler() {
    return _kitHistory.createReplayHandler({
      filter_singleSelect: function (_KDB, _targetValue, _step, _ctx) {
        return applyHistoryReplay(_KDB, {
          targetValue: _targetValue || {},
          step: _step || {},
          direction: _ctx && _ctx.direction
        });
      }
    });
  }

  return {
    createHistoryReplayHandler: createHistoryReplayHandler,
    applyHistoryReplay: applyHistoryReplay,
    resolveHistoryTarget: resolveHistoryTarget,
    replayCommittedSelection: replayCommittedSelection
  };
});

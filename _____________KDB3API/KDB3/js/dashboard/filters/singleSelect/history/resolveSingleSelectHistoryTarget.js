define([
  "../state/selectors.js",
  "../config/actions.js",
  "../../../../core/utils/normalizeCognosScopeId.js",
  "./historyReplayCodes.js"
], function (_selectors, _actions, _normalizeScopeId, _codes) {
  "use strict";

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
    if (!api || typeof api.dispatch !== "function") {
      return { ok: false, errorCode: _codes.REPLAY_FAILED };
    }
    try {
      result = await api.dispatch({
        type: _actions.RECONCILE_FILTER_INSTANCES,
        payload: { reason: "historyReplay" }
      });
    } catch (error) {
      console.error("[singleSelect.resolveSingleSelectHistoryTarget] historyReplay reconcile threw", error);
      return { ok: false, errorCode: _codes.REPLAY_FAILED };
    }
    root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!result || result.ok !== true || result.degraded === true ||
      !root || !root.inventory || root.inventory.freshness !== "fresh") {
      return { ok: false, errorCode: _codes.REPLAY_FAILED };
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

  async function resolveSingleSelectHistoryTarget(_KDB, _descriptor) {
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
        errorCode: candidates.length > 1 ? _codes.INSTANCE_AMBIGUOUS : _codes.INSTANCE_MISSING
      };
    } catch (error) {
      console.error("[singleSelect.resolveSingleSelectHistoryTarget] failed", error);
      return { ok: false, errorCode: _codes.REPLAY_FAILED };
    }
  }

  return resolveSingleSelectHistoryTarget;
});

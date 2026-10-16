define([
  "./state.js",
  "./config.js",
  "./restore/scopeTargets.js",
  "./effects/hostScope/filterRef.js",
  "./effects/hostScope/apply.js",
  "./effects/hostScope/clear.js",
  "../../../core/utils/filters/tabMutationRun/guardTabMutationRun.js",
  "../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js",
  "../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js"
], function (
  _state,
  _config,
  _scopeTargets,
  _filterRef,
  _applyScope,
  _clearScope,
  _guardRunUtil,
  _snapshots,
  _listAffectedPlanSlots
) {
  "use strict";

  var GUARD_OPTS = {
    pinOperationId: false,
    ensureRunIdDefault0: true,
    includeRunIdsInDiagnostic: true,
    missingIdsMessage: "dienststelle tab mutation requires runId and operationId",
    supersededMessage: "dienststelle tab mutation run was superseded"
  };

  function cancelled(_message, _payload, _runtime) {
    return _guardRunUtil.cancelled(_message, _payload, _runtime, GUARD_OPTS);
  }

  function guardRun(_runtime, _payload) {
    return _guardRunUtil.guardRun(_runtime, _payload, GUARD_OPTS);
  }

  function isStale(_runtime, _payload) {
    return _guardRunUtil.isStale(_runtime, _payload, { staleMode: "ds" });
  }

  function readSnapshot(_runtime, _operationId) {
    return _snapshots.readSnapshot(_runtime, _operationId);
  }

  function deleteSnapshot(_runtime, _operationId) {
    _snapshots.deleteSnapshot(_runtime, _operationId);
  }

  function failed(_operationId, _appliedScopes, _clearedScopes, _diagnostics) {
    return {
      ok: false,
      operationId: _operationId || null,
      appliedScopes: _appliedScopes || [],
      clearedScopes: _clearedScopes || [],
      diagnostics: _diagnostics || []
    };
  }

  function resolveScopeIdForSlot(_KDB, _tabTargets, _slot) {
    var tabIdx = _slot && _slot.tabIdx;
    var tabId = _slot && _slot.tabId || null;
    var resolved;
    if (typeof tabIdx !== "number") {
      return {
        ok: false,
        diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "slot tabIdx is missing for scope resolution", tabId: tabId }]
      };
    }
    resolved = _scopeTargets.resolveScopeId(_KDB, _tabTargets || {}, tabIdx);
    if (!resolved || resolved.ok !== true || !resolved.scopeId) {
      return {
        ok: false,
        diagnostics: [{
          code: "TABS_MUTATION_PREPARE_FAILED",
          message: "scopeId could not be resolved for tabIdx " + tabIdx,
          tabId: tabId
        }]
      };
    }
    return { ok: true, scopeId: String(resolved.scopeId) };
  }

  function cloneScopeEntry(_entry) {
    var entry = _entry || {};
    return {
      currentValues: _state.copyValueEntries(entry.currentValues),
      backupValues: _state.copyValueEntries(entry.backupValues),
      pendingValues: _state.copyValueEntries(entry.pendingValues),
      lastObservedHostValues: _state.copyValueEntries(entry.lastObservedHostValues),
      lastConfirmedAt: entry.lastConfirmedAt != null ? entry.lastConfirmedAt : null
    };
  }

  function readScopeEntry(_KDB, _filterKey, _scopeId) {
    var state = _KDB.state.filters.dienststelle || {};
    var filter = (state.byFilter || {})[_filterKey] || {};
    var page = filter.currentSelectionByScope && filter.currentSelectionByScope.pageContext || {};
    return cloneScopeEntry(page[_scopeId]);
  }

  function pushUnique(_arr, _value) {
    if (_arr.indexOf(_value) === -1) {
      _arr.push(_value);
    }
  }

  function prepareFailure(_operationId, _diagnostics) {
    return { ok: false, operationId: _operationId || null, snapshotScopes: [], diagnostics: _diagnostics || [] };
  }

  function resolveAffectedScopes(_KDB, _tabTargets, _plan) {
    var scopeIds = [];
    var diagnostics = [];
    _listAffectedPlanSlots(_plan).forEach(function (slot) {
      var resolved = resolveScopeIdForSlot(_KDB, _tabTargets, slot);
      if (!resolved.ok) {
        diagnostics = diagnostics.concat(resolved.diagnostics || []);
        return;
      }
      pushUnique(scopeIds, resolved.scopeId);
    });
    return diagnostics.length > 0
      ? { ok: false, scopeIds: [], diagnostics: diagnostics }
      : { ok: true, scopeIds: scopeIds, diagnostics: [] };
  }

  function buildSnapshot(_KDB, _scopeIds, _runId, _operationId) {
    var byFilter = _KDB.state.filters.dienststelle.byFilter || {};
    var snapshot = { runId: _runId, operationId: _operationId, byScope: {} };
    _scopeIds.forEach(function (scopeId) {
      snapshot.byScope[scopeId] = {};
      _config.FILTER_KEYS.forEach(function (key) {
        var filterState = byFilter[key] || {};
        var page = filterState.currentSelectionByScope && filterState.currentSelectionByScope.pageContext || {};
        snapshot.byScope[scopeId][key] = cloneScopeEntry(page[scopeId]);
      });
    });
    return snapshot;
  }

  function attachDeleteHistorySlice(_KDB, _tabTargets, _plan, _snapshot, _result) {
    var slot;
    var resolved;
    var slice = {};
    if (!_plan || (_plan.operation !== "delete" && _plan.operation !== "duplicate")) { return _result; }
    slot = _plan.operation === "delete"
      ? (_plan.deletedSlot || {})
      : (_plan.sourceSlot || (_plan.clonePair && _plan.clonePair.from) || {});
    resolved = resolveScopeIdForSlot(_KDB, _tabTargets, slot);
    if (resolved && resolved.ok === true && resolved.scopeId && _snapshot.byScope) {
      slice = _snapshot.byScope[resolved.scopeId] || {};
    }
    _result.historySlice = slice;
    return _result;
  }

  async function prepareTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    var tabTargets = payload.tabIdxToScopeId || {};
    var guard;
    var resolved;
    var snapshot;
    try {
      guard = guardRun(_ctx.runtime, payload);
      if (guard) { return prepareFailure(payload.operationId, guard.diagnostics); }
      if (!payload.plan) {
        return prepareFailure(payload.operationId, [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "tab mutation plan is missing" }]);
      }
      resolved = resolveAffectedScopes(_ctx._KDB, tabTargets, payload.plan);
      if (!resolved.ok) { return prepareFailure(payload.operationId, resolved.diagnostics); }
      snapshot = buildSnapshot(_ctx._KDB, resolved.scopeIds, payload.runId, payload.operationId);
      _snapshots.writeSnapshot(_ctx.runtime, payload.operationId, snapshot);
      return attachDeleteHistorySlice(_ctx._KDB, tabTargets, payload.plan, snapshot, {
        ok: true, operationId: payload.operationId, snapshotScopes: resolved.scopeIds, diagnostics: []
      });
    } catch (error) {
      console.error("[dienststelle.prepareTabMutation] failed", error);
      return prepareFailure(payload.operationId, [{
        code: "TABS_MUTATION_PREPARE_FAILED",
        message: String(error && error.message ? error.message : error)
      }]);
    }
  }

  function dispatchScopeWrite(_ctx, _filterKey, _scopeId, _entry, _clear) {
    _ctx.dispatchInternal({
      type: _state.ACTIONS.TAB_MUTATION_SCOPE_WRITE,
      payload: { filterKey: _filterKey, scopeId: _scopeId, entry: _entry, clear: _clear === true, timestamp: Date.now() }
    });
  }

  // An empty values array stays a replace-with-empty here, not a clearValues:
  // the host treats the two commands differently and this path has always used replace.
  async function applyHostScope(_KDB, _filterKey, _scopeId, _values, _diagnostics) {
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var filterRef = _scopeTargets.lookupScopeFilterRef(_KDB, _filterKey, _scopeId);
    var outcome;
    if (!filtersFacet || !filterRef) {
      _diagnostics.push({
        code: "TABS_MUTATION_APPLY_FAILED",
        filterKey: _filterKey,
        scopeId: _scopeId,
        message: "dienststelle host apply API is unavailable"
      });
      return;
    }
    outcome = await filtersFacet.writeFilter({ ref: filterRef, values: _applyScope.toCognosValues(_values || []) });
    if (!outcome || outcome.ok !== true) {
      _diagnostics.push({
        code: "TABS_MUTATION_APPLY_FAILED",
        filterKey: _filterKey,
        scopeId: _scopeId,
        message: String((outcome && (outcome.errorCode || outcome.reason)) || "host write not applied")
      });
    }
  }

  async function clearHostScope(_KDB, _filterKey, _scopeId, _diagnostics) {
    var cleared = await _clearScope.clearFilterScope(_KDB, _filterKey, _scopeId, _filterRef.readFiltersFacet(_KDB));
    if (!cleared || cleared.ok !== true) {
      _diagnostics.push({
        code: "TABS_MUTATION_APPLY_FAILED",
        filterKey: _filterKey,
        scopeId: _scopeId,
        message: "dienststelle host scope clear failed"
      });
    }
  }

  async function moveScopeForAllFilters(_ctx, _fromScopeId, _toScopeId, _payload, _appliedScopes, _clearedScopes, _diagnostics) {
    var idx;
    var filterKey;
    var sourceEntry;
    for (idx = 0; idx < _config.FILTER_KEYS.length; idx += 1) {
      filterKey = _config.FILTER_KEYS[idx];
      sourceEntry = readScopeEntry(_ctx._KDB, filterKey, _fromScopeId);
      dispatchScopeWrite(_ctx, filterKey, _toScopeId, sourceEntry, false);
      await applyHostScope(_ctx._KDB, filterKey, _toScopeId, sourceEntry.currentValues, _diagnostics);
      dispatchScopeWrite(_ctx, filterKey, _fromScopeId, null, true);
      await clearHostScope(_ctx._KDB, filterKey, _fromScopeId, _diagnostics);
      pushUnique(_appliedScopes, _toScopeId);
      pushUnique(_clearedScopes, _fromScopeId);
      if (isStale(_ctx.runtime, _payload)) { return; }
    }
  }

  async function clearScopeForAllFilters(_ctx, _scopeId, _payload, _clearedScopes, _diagnostics) {
    var idx;
    for (idx = 0; idx < _config.FILTER_KEYS.length; idx += 1) {
      dispatchScopeWrite(_ctx, _config.FILTER_KEYS[idx], _scopeId, null, true);
      await clearHostScope(_ctx._KDB, _config.FILTER_KEYS[idx], _scopeId, _diagnostics);
      pushUnique(_clearedScopes, _scopeId);
      if (isStale(_ctx.runtime, _payload)) { return; }
    }
  }

  async function writeScopeFromSnapshot(_ctx, _scopeId, _sourceByFilter, _payload, _appliedScopes, _diagnostics) {
    var idx;
    var entry;
    for (idx = 0; idx < _config.FILTER_KEYS.length; idx += 1) {
      entry = cloneScopeEntry(_sourceByFilter[_config.FILTER_KEYS[idx]]);
      dispatchScopeWrite(_ctx, _config.FILTER_KEYS[idx], _scopeId, entry, false);
      await applyHostScope(_ctx._KDB, _config.FILTER_KEYS[idx], _scopeId, entry.currentValues, _diagnostics);
      pushUnique(_appliedScopes, _scopeId);
      if (isStale(_ctx.runtime, _payload)) { return; }
    }
  }

  async function resyncHostScope(_KDB, _scopeId, _diagnostics) {
    var idx;
    var entry;
    for (idx = 0; idx < _config.FILTER_KEYS.length; idx += 1) {
      entry = readScopeEntry(_KDB, _config.FILTER_KEYS[idx], _scopeId);
      await applyHostScope(_KDB, _config.FILTER_KEYS[idx], _scopeId, entry.currentValues, _diagnostics);
    }
  }

  return {
    guardRun: guardRun,
    isStale: isStale,
    cancelled: cancelled,
    readSnapshot: readSnapshot,
    deleteSnapshot: deleteSnapshot,
    failed: failed,
    pushUnique: pushUnique,
    resolveScopeIdForSlot: resolveScopeIdForSlot,
    prepareTabMutation: prepareTabMutation,
    moveScopeForAllFilters: moveScopeForAllFilters,
    clearScopeForAllFilters: clearScopeForAllFilters,
    writeScopeFromSnapshot: writeScopeFromSnapshot,
    resyncHostScope: resyncHostScope,
    dispatchScopeWrite: dispatchScopeWrite
  };
});

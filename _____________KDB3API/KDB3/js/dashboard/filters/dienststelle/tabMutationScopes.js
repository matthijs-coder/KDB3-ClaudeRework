define([
  "./state.js",
  "./config.js",
  "./restore/scopeTargets.js",
  "./effects/hostScope/filterRef.js",
  "./effects/hostScope/apply.js",
  "./effects/hostScope/clear.js",
  "../_core/tabMutation.js",
  "../_core/tabMutationScopes.js",
  "../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js"
], function (
  _state,
  _config,
  _scopeTargets,
  _filterRef,
  _applyScope,
  _clearScope,
  _tabMutation,
  _kitScopes,
  _listAffectedPlanSlots
) {
  "use strict";

  var RUN_GUARD = _tabMutation.createRunGuard({
    staleMode: "runId",
    options: {
      pinOperationId: false,
      ensureRunIdDefault0: true,
      includeRunIdsInDiagnostic: true,
      missingIdsMessage: "dienststelle tab mutation requires runId and operationId",
      supersededMessage: "dienststelle tab mutation run was superseded"
    }
  });
  var TAB_MUTATION_BASE = { name: "dienststelle", guard: RUN_GUARD };
  var resolveScopeIdForSlot = _kitScopes.createSlotScopeResolver({ resolveScopeId: _scopeTargets.resolveScopeId });
  var pushUnique = _kitScopes.pushUnique;

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

  function capture(_ctx, _payload) {
    if (!_payload.plan) {
      return { ok: false, diagnostics: [{ code: _tabMutation.CODES.PREPARE_FAILED, message: "tab mutation plan is missing" }] };
    }
    var resolved = _kitScopes.resolveAffectedScopes(
      resolveScopeIdForSlot, _ctx._KDB, _payload.tabIdxToScopeId || {}, _listAffectedPlanSlots(_payload.plan)
    );
    if (!resolved.ok) { return { ok: false, diagnostics: resolved.diagnostics }; }
    return {
      ok: true,
      snapshot: buildSnapshot(_ctx._KDB, resolved.scopeIds, _payload.runId, _payload.operationId),
      scopeIds: resolved.scopeIds
    };
  }

  function historySlice(_ctx, _payload, _snapshot, _slot) {
    var resolved = resolveScopeIdForSlot(_ctx._KDB, _payload.tabIdxToScopeId || {}, _slot);
    if (resolved && resolved.ok === true && resolved.scopeId && _snapshot.byScope) {
      return _snapshot.byScope[resolved.scopeId] || {};
    }
    return {};
  }

  // Unlike singleSelect and nativeMultiSelect, snapshots of older runs are not pruned here.
  var prepareTabMutation = _tabMutation.createPrepare(TAB_MUTATION_BASE, {
    prune: false,
    capture: capture,
    historySlice: historySlice
  });

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
      if (RUN_GUARD.isStale(_ctx.runtime, _payload)) { return; }
    }
  }

  async function clearScopeForAllFilters(_ctx, _scopeId, _payload, _clearedScopes, _diagnostics) {
    var idx;
    for (idx = 0; idx < _config.FILTER_KEYS.length; idx += 1) {
      dispatchScopeWrite(_ctx, _config.FILTER_KEYS[idx], _scopeId, null, true);
      await clearHostScope(_ctx._KDB, _config.FILTER_KEYS[idx], _scopeId, _diagnostics);
      pushUnique(_clearedScopes, _scopeId);
      if (RUN_GUARD.isStale(_ctx.runtime, _payload)) { return; }
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
      if (RUN_GUARD.isStale(_ctx.runtime, _payload)) { return; }
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
    tabMutationBase: TAB_MUTATION_BASE,
    isStale: RUN_GUARD.isStale,
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

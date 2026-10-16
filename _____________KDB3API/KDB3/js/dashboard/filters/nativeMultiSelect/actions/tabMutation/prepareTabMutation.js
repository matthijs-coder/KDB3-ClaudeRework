define([
  "./guardTabMutation.js",
  "../../effects/listUnownedNativeMultiSelectItems.js"
], function (_support, _listUnownedNativeMultiSelectItems) {
  "use strict";

  async function prepareTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    try {
      var guard = _support.guardRun(_ctx.runtime, payload);
      if (guard) { return withFailure(payload.operationId, guard.diagnostics); }
      if (!payload.plan) {
        return withFailure(payload.operationId, [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "tab mutation plan is missing" }]);
      }
      var resolved = resolveAffectedScopes(_ctx._KDB, payload.tabIdxToScopeId || {}, payload.plan);
      if (!resolved.ok) { return withFailure(payload.operationId, resolved.diagnostics); }
      var snapshot = buildSnapshot(_ctx._KDB, _ctx.filtersFacet, resolved.scopeIds, payload.runId, payload.operationId);
      _support.writeSnapshot(_ctx.runtime, payload.operationId, snapshot);
      return attachDeleteHistorySlice(_ctx._KDB, payload.tabIdxToScopeId || {}, payload.plan, snapshot, {
        ok: true, operationId: payload.operationId, snapshotScopes: resolved.scopeIds, diagnostics: []
      });
    } catch (error) {
      console.error("[nativeMultiSelect.prepareTabMutation] failed", error);
      return withFailure(payload.operationId, [{ code: "TABS_MUTATION_PREPARE_FAILED", message: String(error && error.message ? error.message : error) }]);
    }
  }

  function attachDeleteHistorySlice(_KDB, _tabTargets, _plan, _snapshot, _result) {
    var slot;
    var resolved;
    var slice;
    if (!_plan || (_plan.operation !== "delete" && _plan.operation !== "duplicate")) { return _result; }
    slot = _plan.operation === "delete"
      ? (_plan.deletedSlot || {})
      : (_plan.sourceSlot || (_plan.clonePair && _plan.clonePair.from) || {});
    resolved = _support.resolveScopeIdForSlot(_KDB, _tabTargets, slot);
    slice = [];
    if (resolved && resolved.ok === true && resolved.skip) {
      slice = [];
    } else if (resolved && resolved.ok === true && resolved.scopeId && _snapshot.byScope) {
      slice = _snapshot.byScope[resolved.scopeId] || [];
    }
    _result.historySlice = slice;
    return _result;
  }

  function resolveAffectedScopes(_KDB, _tabTargets, _plan) {
    var scopeIds = [];
    var diagnostics = [];
    var slots = _support.listAffectedSlots(_plan);
    var idx;
    for (idx = 0; idx < slots.length; idx += 1) {
      var slot = slots[idx];
      var resolved = _support.resolveScopeIdForSlot(_KDB, _tabTargets, slot);
      if (!resolved.ok) { diagnostics = diagnostics.concat(resolved.diagnostics || []); continue; }
      if (resolved.skip) { continue; }
      if (scopeIds.indexOf(resolved.scopeId) === -1) { scopeIds.push(resolved.scopeId); }
    }
    return diagnostics.length > 0 ? { ok: false, scopeIds: [], diagnostics: diagnostics } : { ok: true, scopeIds: scopeIds, diagnostics: [] };
  }

  function buildSnapshot(_KDB, _filtersFacet, _scopeIds, _runId, _operationId) {
    var snapshot = { runId: _runId, operationId: _operationId, byScope: {} };
    var scopeIdx;
    for (scopeIdx = 0; scopeIdx < _scopeIds.length; scopeIdx += 1) {
      var scopeId = _scopeIds[scopeIdx];
      snapshot.byScope[scopeId] = _listUnownedNativeMultiSelectItems(_KDB, scopeId, _filtersFacet);
    }
    return snapshot;
  }

  function withFailure(_operationId, _diagnostics) {
    return { ok: false, operationId: _operationId || null, snapshotScopes: [], diagnostics: _diagnostics || [] };
  }

  return prepareTabMutation;
});

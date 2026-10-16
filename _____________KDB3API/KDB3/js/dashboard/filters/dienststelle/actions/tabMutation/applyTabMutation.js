define([
  "./guardTabMutation.js",
  "./applyTabMutationScopeOps.js",
  "./applyTabMutationMove.js",
  "./applyTabMutationDuplicate.js",
  "./applyTabMutationRestoreDeleted.js"
], function (_support, _scopeOps, _applyMove, _applyDuplicate, _applyRestoreDeleted) {
  "use strict";

  async function applyTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _support.guardRun(_ctx.runtime, payload);
    if (guard) { return _scopeOps.failed(payload.operationId, [], [], guard.diagnostics); }
    if (!payload.plan || (payload.plan.operation !== "delete" && payload.plan.operation !== "move" && payload.plan.operation !== "duplicate" && payload.plan.operation !== "restoreDeleted")) {
      return _scopeOps.failed(payload.operationId, [], [], [{ code: "TABS_MUTATION_APPLY_FAILED", message: "dienststelle apply supports delete, move, duplicate, and restoreDeleted" }]);
    }
    if (payload.plan.operation === "delete") { return applyDeleteMutation(_ctx, payload); }
    if (payload.plan.operation === "duplicate") { return _applyDuplicate(_ctx, payload); }
    if (payload.plan.operation === "restoreDeleted") { return _applyRestoreDeleted(_ctx, payload); }
    return _applyMove(_ctx, payload);
  }

  async function applyDeleteMutation(_ctx, payload) {
    var tabTargets = payload.tabIdxToScopeId || {};
    var resolvedDeleted = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, payload.plan.deletedSlot);
    if (!resolvedDeleted.ok) { return _scopeOps.failed(payload.operationId, [], [], resolvedDeleted.diagnostics); }
    var appliedScopes = [];
    var clearedScopes = [];
    var diagnostics = [];
    await _scopeOps.clearScopeForAllFilters(_ctx, resolvedDeleted.scopeId, payload, clearedScopes, diagnostics, _support);
    if (_support.isStale(_ctx.runtime, payload)) { return _scopeOps.failed(payload.operationId, appliedScopes, clearedScopes, _support.cancelled("dienststelle apply superseded", payload, _ctx.runtime).diagnostics); }
    var moves = (payload.plan.slotMoves || []).slice().sort(function (a, b) { return Number(a.fromTabIdx || 0) - Number(b.fromTabIdx || 0); });
    for (var idx = 0; idx < moves.length; idx += 1) {
      if (_support.isStale(_ctx.runtime, payload)) { return _scopeOps.failed(payload.operationId, appliedScopes, clearedScopes, _support.cancelled("dienststelle apply superseded", payload, _ctx.runtime).diagnostics); }
      var fromResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, { tabIdx: moves[idx].fromTabIdx, tabId: moves[idx].fromTabId });
      var toResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, { tabIdx: moves[idx].toTabIdx, tabId: moves[idx].toTabId });
      if (!fromResolved.ok || !toResolved.ok) { diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []); continue; }
      await _scopeOps.moveScopeForAllFilters(_ctx, fromResolved.scopeId, toResolved.scopeId, payload, appliedScopes, clearedScopes, diagnostics, _support);
    }
    if (diagnostics.length > 0) { return _scopeOps.failed(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    return { ok: true, operationId: payload.operationId, appliedScopes: appliedScopes, clearedScopes: clearedScopes, diagnostics: [] };
  }

  return applyTabMutation;
});

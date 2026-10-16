define([
  "./guardTabMutation.js",
  "./applyTabMutationScopeOps.js"
], function (_support, _scopeOps) {
  "use strict";

  async function applyRestoreDeletedMutation(_ctx, payload) {
    try {
      return await runRestoreDeletedMutation(_ctx, payload);
    } catch (error) {
      console.error("[nativeMultiSelect.applyTabMutationRestoreDeleted] failed", error);
      return _scopeOps.failed(payload.operationId, [], [], [{ code: "TABS_MUTATION_APPLY_FAILED", message: String(error && error.message ? error.message : error) }]);
    }
  }

  async function runRestoreDeletedMutation(_ctx, payload) {
    var snapshot = _support.readSnapshot(_ctx.runtime, payload.operationId);
    if (!snapshot || snapshot.runId !== payload.runId) {
      return _scopeOps.failed(payload.operationId, [], [], [{ code: "TABS_MUTATION_APPLY_FAILED", message: "NativeMultiSelect prepare snapshot missing" }]);
    }
    var tabTargets = payload.tabIdxToScopeId || {};
    var appliedScopes = [];
    var diagnostics = [];
    var moves = payload.plan.slotMoves || [];
    var restoreItems = payload.plan.restore && payload.plan.restore.filters && payload.plan.restore.filters.nativeMultiSelect || [];
    var i;
    for (i = 0; i < moves.length; i += 1) {
      if (_support.isStale(_ctx.runtime, payload)) {
        return _scopeOps.failed(payload.operationId, appliedScopes, [], _support.cancelled("NativeMultiSelect apply superseded", payload, _ctx.runtime).diagnostics);
      }
      var shiftResult = await shiftScopeFromSnapshot(_ctx, payload, tabTargets, snapshot, moves[i], appliedScopes, diagnostics);
      if (shiftResult === false) { return _scopeOps.failed(payload.operationId, appliedScopes, [], diagnostics); }
    }
    if (_support.isStale(_ctx.runtime, payload)) {
      return _scopeOps.failed(payload.operationId, appliedScopes, [], _support.cancelled("NativeMultiSelect apply superseded", payload, _ctx.runtime).diagnostics);
    }
    var toResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, payload.plan.insertSlot);
    if (!toResolved.ok) {
      diagnostics = diagnostics.concat(toResolved.diagnostics || []);
      return _scopeOps.failed(payload.operationId, appliedScopes, [], diagnostics);
    }
    if (!toResolved.skip) {
      await _scopeOps.writeScopeFromSnapshot(_ctx, toResolved.scopeId, restoreItems, payload, appliedScopes, diagnostics, _support);
    }
    if (diagnostics.length > 0) { return _scopeOps.failed(payload.operationId, appliedScopes, [], diagnostics); }
    return { ok: true, operationId: payload.operationId, appliedScopes: appliedScopes, clearedScopes: [], diagnostics: [] };
  }

  async function shiftScopeFromSnapshot(_ctx, payload, tabTargets, snapshot, move, appliedScopes, diagnostics) {
    var fromResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, { tabIdx: move.fromTabIdx, tabId: move.fromTabId });
    var toResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, { tabIdx: move.toTabIdx, tabId: move.toTabId });
    if (!fromResolved.ok || !toResolved.ok) {
      diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []);
      return false;
    }
    if (fromResolved.skip || toResolved.skip) { return true; }
    var sourceItems = snapshot.byScope[fromResolved.scopeId] || [];
    await _scopeOps.writeScopeFromSnapshot(_ctx, toResolved.scopeId, sourceItems, payload, appliedScopes, diagnostics, _support);
    return true;
  }

  return applyRestoreDeletedMutation;
});

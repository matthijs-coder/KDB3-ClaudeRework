define([
  "./guardTabMutation.js",
  "./applyTabMutationScopeOps.js"
], function (_support, _scopeOps) {
  "use strict";

  async function applyDuplicateMutation(_ctx, payload) {
    var snapshot = _support.readSnapshot(_ctx.runtime, payload.operationId);
    if (!snapshot || snapshot.runId !== payload.runId) {
      return _scopeOps.failed(payload.operationId, [], [], [{ code: "TABS_MUTATION_APPLY_FAILED", message: "NativeMultiSelect prepare snapshot missing" }]);
    }
    var tabTargets = payload.tabIdxToScopeId || {};
    var appliedScopes = [];
    var diagnostics = [];
    var moves = payload.plan.slotMoves || [];
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
    var clonePair = payload.plan.clonePair || {};
    var fromResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, clonePair.from || payload.plan.sourceSlot);
    var toResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, clonePair.to || payload.plan.insertSlot);
    if (!fromResolved.ok || !toResolved.ok) {
      diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []);
      return _scopeOps.failed(payload.operationId, appliedScopes, [], diagnostics);
    }
    if (!fromResolved.skip && !toResolved.skip) {
      var cloneSource = snapshot.byScope[fromResolved.scopeId] || [];
      await _scopeOps.writeScopeFromSnapshot(_ctx, toResolved.scopeId, cloneSource, payload, appliedScopes, diagnostics, _support);
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

  return applyDuplicateMutation;
});

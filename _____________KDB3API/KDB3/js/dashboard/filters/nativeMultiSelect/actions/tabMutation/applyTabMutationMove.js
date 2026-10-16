define([
  "./guardTabMutation.js",
  "./applyTabMutationScopeOps.js"
], function (_support, _scopeOps) {
  "use strict";

  async function applyMoveMutation(_ctx, payload) {
    var snapshot = _support.readSnapshot(_ctx.runtime, payload.operationId);
    if (!snapshot || snapshot.runId !== payload.runId) {
      return _scopeOps.failed(payload.operationId, [], [], [{ code: "TABS_MUTATION_APPLY_FAILED", message: "NativeMultiSelect prepare snapshot missing" }]);
    }
    var tabTargets = payload.tabIdxToScopeId || {};
    var appliedScopes = [];
    var clearedScopes = [];
    var diagnostics = [];
    var fromScopeIds = collectFromScopeIds(_ctx, payload, tabTargets, diagnostics);
    if (diagnostics.length > 0) { return _scopeOps.failed(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    var c;
    for (c = 0; c < fromScopeIds.length; c += 1) {
      await _scopeOps.clearScopeItems(_ctx, fromScopeIds[c], snapshot.byScope[fromScopeIds[c]] || [], payload, clearedScopes, diagnostics, _support);
      if (_support.isStale(_ctx.runtime, payload)) {
        return _scopeOps.failed(payload.operationId, appliedScopes, clearedScopes, _support.cancelled("NativeMultiSelect apply superseded", payload, _ctx.runtime).diagnostics);
      }
    }
    var moves = payload.plan.slotMoves || [];
    var i;
    for (i = 0; i < moves.length; i += 1) {
      if (_support.isStale(_ctx.runtime, payload)) {
        return _scopeOps.failed(payload.operationId, appliedScopes, clearedScopes, _support.cancelled("NativeMultiSelect apply superseded", payload, _ctx.runtime).diagnostics);
      }
      var fromResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, { tabIdx: moves[i].fromTabIdx, tabId: moves[i].fromTabId });
      var toResolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, { tabIdx: moves[i].toTabIdx, tabId: moves[i].toTabId });
      if (!fromResolved.ok || !toResolved.ok) { diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []); continue; }
      if (fromResolved.skip || toResolved.skip) { continue; }
      var sourceItems = snapshot.byScope[fromResolved.scopeId] || [];
      await _scopeOps.writeScopeFromSnapshot(_ctx, toResolved.scopeId, sourceItems, payload, appliedScopes, diagnostics, _support);
    }
    if (diagnostics.length > 0) { return _scopeOps.failed(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    return { ok: true, operationId: payload.operationId, appliedScopes: appliedScopes, clearedScopes: clearedScopes, diagnostics: [] };
  }

  function collectFromScopeIds(_ctx, _payload, _tabTargets, _diagnostics) {
    var scopeIds = [];
    (_payload.plan.slotMoves || []).forEach(function (move) {
      var resolved = _support.resolveScopeIdForSlot(_ctx._KDB, _tabTargets, { tabIdx: move.fromTabIdx, tabId: move.fromTabId });
      if (!resolved.ok) { _diagnostics.push.apply(_diagnostics, resolved.diagnostics || []); return; }
      if (resolved.skip) { return; }
      if (scopeIds.indexOf(resolved.scopeId) === -1) { scopeIds.push(resolved.scopeId); }
    });
    return scopeIds;
  }

  return applyMoveMutation;
});

define([
  "./guardTabMutation.js",
  "./applyTabMutationScopeOps.js"
], function (_support, _scopeOps) {
  "use strict";

  function collectAffectedSlots(_plan) {
    var plan = _plan || {};
    var slots = [];
    var seen = {};
    function pushSlot(_slot) {
      var slot = _slot || {};
      if (typeof slot.tabIdx !== "number" || seen[slot.tabIdx]) { return; }
      seen[slot.tabIdx] = true;
      slots.push({ tabIdx: slot.tabIdx, tabId: slot.tabId || null });
    }
    (plan.slotMoves || []).forEach(function (_move) {
      pushSlot({ tabIdx: _move.fromTabIdx, tabId: _move.fromTabId });
      pushSlot({ tabIdx: _move.toTabIdx, tabId: _move.toTabId });
    });
    if (plan.deletedSlot) { pushSlot(plan.deletedSlot); }
    if (plan.hideSlot) { pushSlot(plan.hideSlot); }
    if (plan.operation === "duplicate") {
      if (plan.clonePair) {
        pushSlot(plan.clonePair.from);
        pushSlot(plan.clonePair.to);
      }
      if (plan.sourceSlot) { pushSlot(plan.sourceSlot); }
      if (plan.insertSlot) { pushSlot(plan.insertSlot); }
      if (plan.revealSlot) { pushSlot(plan.revealSlot); }
    }
    if (plan.operation === "restoreDeleted") {
      if (plan.insertSlot) { pushSlot(plan.insertSlot); }
      if (plan.revealSlot) { pushSlot(plan.revealSlot); }
    }
    return slots;
  }

  async function resyncTabMutationHost(_ctx, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    try {
      var guard = _support.guardRun(_ctx.runtime, payload);
      if (guard) { return { ok: false, diagnostics: guard.diagnostics || [] }; }
      var tabTargets = payload.tabIdxToScopeId || {};
      var ownerState = _ctx._KDB.state && _ctx._KDB.state.filters ? _ctx._KDB.state.filters.nativeMultiSelect : null;
      var byScope = ownerState && ownerState.byScope ? ownerState.byScope : {};
      var affectedSlots = collectAffectedSlots(payload.plan);
      var s;
      for (s = 0; s < affectedSlots.length; s += 1) {
        var resolved = _support.resolveScopeIdForSlot(_ctx._KDB, tabTargets, affectedSlots[s]);
        if (!resolved.ok) {
          diagnostics = diagnostics.concat(resolved.diagnostics || []);
          continue;
        }
        if (resolved.skip) { continue; }
        await _scopeOps.resyncHostScope(_ctx._KDB, resolved.scopeId, byScope[resolved.scopeId] || [], diagnostics, _ctx.filtersFacet);
      }
      return { ok: true, operationId: payload.operationId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[nativeMultiSelect.resyncTabMutationHost] failed", { operationId: payload.operationId }, error);
      diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", message: String(error && error.message ? error.message : error) });
      return { ok: false, operationId: payload.operationId, diagnostics: diagnostics };
    }
  }

  return resyncTabMutationHost;
});

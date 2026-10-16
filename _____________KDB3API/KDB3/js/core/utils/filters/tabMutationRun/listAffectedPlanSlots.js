define([], function () {
  "use strict";

  // Slots a tab-mutation plan touches, as `{ tabIdx, tabId }`.
  // Default: one entry per plan position, as the plan carries them (callers de-duplicate by scope id).
  // options.dedupeByTabIdx    one entry per numeric tabIdx, first occurrence wins, tabId normalised to null
  // options.includeClonePair  duplicate: clonePair.from and clonePair.to come first
  // options.includeSourceSlot duplicate: sourceSlot (default true)
  function listAffectedPlanSlots(_plan, _options) {
    try {
      var options = _options || {};
      var plan = _plan || {};
      var dedupe = options.dedupeByTabIdx === true;
      var slots = [];
      var seen = {};
      var push = function (_tabIdx, _tabId, _present) {
        if (!dedupe) {
          if (_present) { slots.push({ tabIdx: _tabIdx, tabId: _tabId }); }
          return;
        }
        if (typeof _tabIdx !== "number" || seen[_tabIdx]) { return; }
        seen[_tabIdx] = true;
        slots.push({ tabIdx: _tabIdx, tabId: _tabId || null });
      };
      var pushSlot = function (_slot) { if (_slot) { push(_slot.tabIdx, _slot.tabId, true); } };
      var slotMoves = plan.slotMoves || [];
      for (var i = 0; i < slotMoves.length; i++) {
        var move = slotMoves[i];
        push(move.fromTabIdx, move.fromTabId, move.fromTabIdx != null);
        push(move.toTabIdx, move.toTabId, move.toTabIdx != null);
      }
      pushSlot(plan.deletedSlot);
      pushSlot(plan.hideSlot);
      if (plan.operation === "duplicate") {
        if (options.includeClonePair === true && plan.clonePair) {
          pushSlot(plan.clonePair.from);
          pushSlot(plan.clonePair.to);
        }
        if (options.includeSourceSlot !== false) { pushSlot(plan.sourceSlot); }
        pushSlot(plan.insertSlot);
        pushSlot(plan.revealSlot);
      }
      if (plan.operation === "restoreDeleted") {
        pushSlot(plan.insertSlot);
        pushSlot(plan.revealSlot);
      }
      return slots;
    } catch (error) {
      console.error("[tabMutationRun.listAffectedPlanSlots] failed", error);
      throw error;
    }
  }

  return listAffectedPlanSlots;
});

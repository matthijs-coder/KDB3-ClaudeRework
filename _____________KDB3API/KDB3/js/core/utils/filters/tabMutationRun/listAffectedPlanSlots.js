define([], function () {
  "use strict";

  // Slots a tab-mutation plan touches, as `{ tabIdx, tabId }`.
  // Default: one entry per plan position, as the plan carries them (callers de-duplicate by scope id).
  // options.dedupeByTabIdx    one entry per numeric tabIdx, first occurrence wins, tabId normalised to null
  // options.includeClonePair  duplicate: clonePair.from and clonePair.to come first
  // options.includeSourceSlot duplicate: sourceSlot (default true)
  // Without dedupeByTabIdx the plan must be an object and slotMoves is read by index; with it a missing plan reads as
  // empty and slotMoves goes through forEach (holes are skipped, a non-array throws), as the owner copies did.
  function listAffectedPlanSlots(_plan, _options) {
    var options = _options || {};
    var dedupe = options.dedupeByTabIdx === true;
    var plan = dedupe ? _plan || {} : _plan;
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
    var pushMove = function (_move) {
      push(_move.fromTabIdx, _move.fromTabId, _move.fromTabIdx != null);
      push(_move.toTabIdx, _move.toTabId, _move.toTabIdx != null);
    };
    if (dedupe) {
      (plan.slotMoves || []).forEach(pushMove);
    } else {
      var slotMoves = plan.slotMoves || [];
      for (var i = 0; i < slotMoves.length; i++) { pushMove(slotMoves[i]); }
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
  }

  return listAffectedPlanSlots;
});

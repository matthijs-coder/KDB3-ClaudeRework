define([], function () {
  "use strict";

  function __controller(_plan) {
    try {
      var slots = [];
      var slotMoves = _plan.slotMoves || [];
      for (var i = 0; i < slotMoves.length; i++) {
        var move = slotMoves[i];
        slots.push(move.fromTabIdx != null ? { tabIdx: move.fromTabIdx, tabId: move.fromTabId } : null);
        slots.push(move.toTabIdx != null ? { tabIdx: move.toTabIdx, tabId: move.toTabId } : null);
      }
      if (_plan.deletedSlot) { slots.push({ tabIdx: _plan.deletedSlot.tabIdx, tabId: _plan.deletedSlot.tabId }); }
      if (_plan.hideSlot) { slots.push({ tabIdx: _plan.hideSlot.tabIdx, tabId: _plan.hideSlot.tabId }); }
      if (_plan.operation === "duplicate") {
        if (_plan.sourceSlot) { slots.push({ tabIdx: _plan.sourceSlot.tabIdx, tabId: _plan.sourceSlot.tabId }); }
        if (_plan.insertSlot) { slots.push({ tabIdx: _plan.insertSlot.tabIdx, tabId: _plan.insertSlot.tabId }); }
        if (_plan.revealSlot) { slots.push({ tabIdx: _plan.revealSlot.tabIdx, tabId: _plan.revealSlot.tabId }); }
      }
      if (_plan.operation === "restoreDeleted") {
        if (_plan.insertSlot) { slots.push({ tabIdx: _plan.insertSlot.tabIdx, tabId: _plan.insertSlot.tabId }); }
        if (_plan.revealSlot) { slots.push({ tabIdx: _plan.revealSlot.tabIdx, tabId: _plan.revealSlot.tabId }); }
      }
      return slots.filter(Boolean);
    } catch (error) {
      console.error("[tabMutationRun.listAffectedPlanSlots] failed", error);
      throw error;
    }
  }

  return __controller;
});

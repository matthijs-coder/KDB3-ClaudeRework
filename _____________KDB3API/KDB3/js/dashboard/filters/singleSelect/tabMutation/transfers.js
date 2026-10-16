define([], function () {
  "use strict";

  function slot(_value, _prefix) {
    var value = _value || {};
    var prefix = _prefix || "";
    return {
      tabId: value[prefix + "TabId"] || value.tabId || null,
      tabIdx: value[prefix + "TabIdx"] != null ? value[prefix + "TabIdx"] : value.tabIdx,
      index: value[prefix + "Index"] != null ? value[prefix + "Index"] : value.index
    };
  }

  function pairFromMove(_move) {
    return { from: slot(_move, "from"), to: slot(_move, "to") };
  }

  function readDuplicatePair(_plan) {
    var from = _plan.sourceSlot || _plan.duplicateSource || _plan.duplicatedFrom || (_plan.clonePair && _plan.clonePair.from);
    var to = _plan.insertSlot || _plan.targetSlot || _plan.newSlot || _plan.duplicatedSlot || (_plan.clonePair && _plan.clonePair.to);
    if (from && to) { return { from: slot(from), to: slot(to) }; }
    return Array.isArray(_plan.slotMoves) && _plan.slotMoves[0]
      ? pairFromMove(_plan.slotMoves[0]) : null;
  }

  function slotKey(_slot) {
    return [_slot.tabId || "", _slot.tabIdx == null ? "" : _slot.tabIdx, _slot.index == null ? "" : _slot.index].join("|");
  }

  function uniqueSlots(_slots) {
    var seen = {};
    return _slots.filter(function (_slot) {
      var key = slotKey(_slot);
      if (seen[key]) { return false; }
      seen[key] = true;
      return true;
    });
  }

  function buildTabMutationTransfers(_plan) {
    try {
      var plan = _plan || {};
      var transfers = Array.isArray(plan.transferPairs)
        ? plan.transferPairs.map(function (_pair) {
          return { from: slot(_pair.from || _pair, "from"), to: slot(_pair.to || _pair, "to") };
        })
        : (plan.slotMoves || []).map(pairFromMove);
      if (plan.operation === "duplicate") {
        transfers = (plan.slotMoves || []).map(pairFromMove);
        var duplicate = readDuplicatePair(plan);
        if (duplicate) { transfers.push(duplicate); }
      }
      if (plan.operation === "restoreDeleted") {
        transfers = (plan.slotMoves || []).map(pairFromMove);
      }
      var fromKeys = {};
      transfers.forEach(function (_pair) {
        fromKeys[slotKey(_pair.from)] = _pair.from;
      });
      var clearSlots = [];
      if (plan.operation !== "duplicate" && plan.operation !== "restoreDeleted") {
        Object.keys(fromKeys).forEach(function (_key) {
          clearSlots.push(fromKeys[_key]);
        });
      }
      if (plan.operation === "delete" && plan.deletedSlot) {
        clearSlots.push(slot(plan.deletedSlot));
      }
      if (plan.operation === "delete" && plan.hideSlot) {
        clearSlots.push(slot(plan.hideSlot));
      }
      (plan.clearSlots || []).forEach(function (_slot) { clearSlots.push(slot(_slot)); });
      var affected = [];
      transfers.forEach(function (_pair) { affected.push(_pair.from, _pair.to); });
      clearSlots.forEach(function (_slot) { affected.push(_slot); });
      if (plan.operation === "duplicate" && plan.revealSlot) { affected.push(slot(plan.revealSlot)); }
      if (plan.operation === "restoreDeleted") {
        if (plan.insertSlot) { affected.push(slot(plan.insertSlot)); }
        if (plan.revealSlot) { affected.push(slot(plan.revealSlot)); }
      }
      return {
        transfers: transfers,
        clearSlots: uniqueSlots(clearSlots),
        affectedSlots: uniqueSlots(affected)
      };
    } catch (error) {
      console.error("[singleSelect.buildTabMutationTransfers] failed", error);
      throw error;
    }
  }

  return { buildTabMutationTransfers: buildTabMutationTransfers };
});

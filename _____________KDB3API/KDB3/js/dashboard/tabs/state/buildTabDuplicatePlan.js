define([
  "../config/mutationCodes.js",
  "../config/defaults.js",
  "./buildTabMutationPlan.js",
  "./listDashboardSlots.js"
], function (_codes, _defaults, _planHelpers, _listDashboardSlots) {
  "use strict";

  var OP_COUNTER = 0;
  var countVisible = _planHelpers.countVisible;
  var readContiguousPrefixError = _planHelpers.readContiguousPrefixError;

  function buildTabDuplicatePlan(_state, _request) {
    var state = _state || {};
    var request = _request || {};
    var slots = _listDashboardSlots(state);
    var contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    var source = resolveSourceSlot(slots, request);
    if (!source) { return fail(_codes.APPLY_FAILED, "Duplicate source tab was not found."); }
    if (source.slot.isHelper === true || source.slot.visible !== true) { return fail(_codes.APPLY_FAILED, "Duplicate source is not a visible dashboard tab."); }
    var visibleCount = countVisible(slots);
    var maxUserTabs = state.limits && typeof state.limits.maxUserTabs === "number"
      ? state.limits.maxUserTabs : _defaults.MAX_USER_TABS;
    if (visibleCount >= maxUserTabs) { return fail(_codes.MAX_VISIBLE, "No hidden slot is available to reveal."); }
    var revealTabIdx = visibleCount;
    var revealSlot = slots[revealTabIdx];
    if (!revealSlot) { return fail(_codes.MAX_VISIBLE, "No hidden slot is available to reveal."); }
    var insertTabIdx = source.tabIdx + 1;
    var lastVisibleTabIdx = visibleCount - 1;
    var sourceSlot = Object.freeze({ tabIdx: source.tabIdx, index: source.slot.index, tabId: source.slot.tabId });
    var insertSlot = Object.freeze({ tabIdx: insertTabIdx, index: slots[insertTabIdx].index, tabId: slots[insertTabIdx].tabId });
    var frozenReveal = Object.freeze({ tabIdx: revealTabIdx, index: revealSlot.index, tabId: revealSlot.tabId || null });
    var slotMoves = buildSlotMoves(slots, insertTabIdx, lastVisibleTabIdx);
    var plan = Object.freeze({
      operation: "duplicate",
      operationId: createOperationId(),
      sourceSlot: sourceSlot,
      revealSlot: frozenReveal,
      insertSlot: insertSlot,
      slotMoves: slotMoves,
      clonePair: Object.freeze({ from: sourceSlot, to: insertSlot }),
      landing: sourceSlot,
      affectedTabIds: listAffectedTabIds(slotMoves, sourceSlot.tabId, insertSlot.tabId, frozenReveal.tabId),
      names: { byIndexAfter: buildNamesByIndexAfter(slots, source, insertTabIdx, lastVisibleTabIdx, frozenReveal) }
    });
    return { ok: true, plan: plan };
  }

  function resolveSourceSlot(slots, request) {
    if (typeof request.tabId === "string" && request.tabId) {
      return findSlot(slots, function (slot) { return slot.tabId === request.tabId; });
    }
    if (typeof request.tabIndex === "number") {
      return findSlot(slots, function (slot, tabIdx) { return tabIdx === request.tabIndex || slot.index === request.tabIndex; });
    }
    return null;
  }

  function buildSlotMoves(slots, insertTabIdx, lastVisibleTabIdx) {
    var moves = [];
    for (var tabIdx = lastVisibleTabIdx; tabIdx >= insertTabIdx; tabIdx -= 1) {
      moves.push(freezeMove(slots, tabIdx, tabIdx + 1));
    }
    return moves;
  }

  function freezeMove(slots, fromTabIdx, toTabIdx) {
    return Object.freeze({
      fromIndex: slots[fromTabIdx].index, fromTabId: slots[fromTabIdx].tabId, fromTabIdx: fromTabIdx,
      toIndex: slots[toTabIdx].index, toTabId: slots[toTabIdx].tabId, toTabIdx: toTabIdx
    });
  }

  function buildNamesByIndexAfter(slots, source, insertTabIdx, lastVisibleTabIdx, revealSlot) {
    var names = {};
    names[String(slots[insertTabIdx].index)] = source.slot.name;
    for (var tabIdx = insertTabIdx + 1; tabIdx <= lastVisibleTabIdx; tabIdx += 1) {
      names[String(slots[tabIdx].index)] = slots[tabIdx - 1].name;
    }
    names[String(revealSlot.index)] = slots[lastVisibleTabIdx].name;
    return Object.freeze(names);
  }

  function listAffectedTabIds(slotMoves, sourceTabId, insertTabId, revealTabId) {
    var seen = {};
    [sourceTabId, insertTabId, revealTabId].forEach(function (tabId) { if (tabId) { seen[tabId] = true; } });
    slotMoves.forEach(function (move) { if (move.fromTabId) { seen[move.fromTabId] = true; } if (move.toTabId) { seen[move.toTabId] = true; } });
    return Object.freeze(Object.keys(seen));
  }

  function findSlot(slots, matcher) { var tabIdx = slots.findIndex(matcher); return tabIdx < 0 ? null : { tabIdx: tabIdx, slot: slots[tabIdx] }; }
  function createOperationId() { OP_COUNTER += 1; return "tabmut-" + Date.now() + "-" + OP_COUNTER; }
  function fail(code, message) { return { ok: false, errorCode: code, diagnostics: [{ code: code, message: message }] }; }

  return buildTabDuplicatePlan;
});

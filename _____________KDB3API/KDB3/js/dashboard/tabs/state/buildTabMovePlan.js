define([
  "../config/mutationCodes.js",
  "./buildTabMutationPlan.js",
  "../slots.js"
], function (_codes, _deletePlanHelpers, _slots) {
  "use strict";

  var OP_COUNTER = 0;
  var countVisible = _deletePlanHelpers.countVisible;
  var readContiguousPrefixError = _deletePlanHelpers.readContiguousPrefixError;

  function buildTabMovePlan(_state, _request) {
    var state = _state || {};
    var request = _request || {};
    var slots = _slots.listDashboardSlots(state);
    var contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    var source = resolveSourceSlot(slots, request);
    if (!source) { return fail(_codes.APPLY_FAILED, "Move source tab was not found."); }
    if (source.slot.isHelper === true || source.slot.visible !== true) { return fail(_codes.APPLY_FAILED, "Move source is not a visible dashboard tab."); }
    var visibleCount = countVisible(slots);
    var d = request.targetPosition;
    if (typeof d !== "number" || d < 0 || d >= visibleCount) { return fail(_codes.APPLY_FAILED, "Move target position is out of range."); }
    if (slots[d].visible !== true) { return fail(_codes.APPLY_FAILED, "Move target is not a visible dashboard tab."); }
    var s = source.tabIdx;
    if (s === d) { return { ok: false, errorCode: _codes.SAME_POSITION, diagnostics: [{ code: _codes.SAME_POSITION, message: "Source and target positions are identical." }] }; }
    var slotMoves = buildSlotMoves(slots, s, d);
    var landing = buildLanding(slots, s, d);
    var plan = Object.freeze({
      operation: "move",
      operationId: createOperationId(),
      sourceSlot: Object.freeze({ tabIdx: s, index: source.slot.index, tabId: source.slot.tabId }),
      targetTabIdx: d,
      slotMoves: slotMoves,
      landing: landing,
      affectedTabIds: listAffectedTabIds(slotMoves, source.slot.tabId, landing.tabId),
      names: { byIndexAfter: buildNamesByIndexAfter(slots, s, d) }
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

  function buildSlotMoves(slots, s, d) {
    var moves = [freezeMove(slots, s, d)];
    if (s < d) {
      for (var i = s + 1; i <= d; i += 1) { moves.push(freezeMove(slots, i, i - 1)); }
    } else {
      for (var j = d; j < s; j += 1) { moves.push(freezeMove(slots, j, j + 1)); }
    }
    return moves;
  }

  function freezeMove(slots, fromTabIdx, toTabIdx) {
    return Object.freeze({
      fromIndex: slots[fromTabIdx].index, fromTabId: slots[fromTabIdx].tabId, fromTabIdx: fromTabIdx,
      toIndex: slots[toTabIdx].index, toTabId: slots[toTabIdx].tabId, toTabIdx: toTabIdx
    });
  }

  function buildNamesByIndexAfter(slots, s, d) {
    var names = {};
    var minI = Math.min(s, d);
    var maxI = Math.max(s, d);
    for (var i = minI; i <= maxI; i += 1) {
      var sourceTabIdx = i === d ? s : (s < d && i >= s && i < d ? i + 1 : (s > d && i > d && i <= s ? i - 1 : i));
      names[String(slots[i].index)] = slots[sourceTabIdx].name;
    }
    return Object.freeze(names);
  }

  function buildLanding(slots, s, d) {
    var activeTabIdx = findActiveTabIdx(slots);
    var landingTabIdx = activeTabIdx;
    if (activeTabIdx === s) { landingTabIdx = d; }
    else if (s < d && activeTabIdx > s && activeTabIdx <= d) { landingTabIdx = activeTabIdx - 1; }
    else if (s > d && activeTabIdx >= d && activeTabIdx < s) { landingTabIdx = activeTabIdx + 1; }
    var landing = slots[landingTabIdx] || slots[0] || {};
    return Object.freeze({ tabIdx: landingTabIdx, index: landing.index, tabId: landing.tabId || null });
  }

  function listAffectedTabIds(slotMoves, sourceTabId, landingTabId) {
    var seen = {};
    if (sourceTabId) { seen[sourceTabId] = true; }
    if (landingTabId) { seen[landingTabId] = true; }
    slotMoves.forEach(function (move) { if (move.fromTabId) { seen[move.fromTabId] = true; } if (move.toTabId) { seen[move.toTabId] = true; } });
    return Object.freeze(Object.keys(seen));
  }

  function findActiveTabIdx(slots) { var idx = slots.findIndex(function (slot) { return slot.isActive === true; }); return idx >= 0 ? idx : 0; }
  function findSlot(slots, matcher) { var tabIdx = slots.findIndex(matcher); return tabIdx < 0 ? null : { tabIdx: tabIdx, slot: slots[tabIdx] }; }
  function createOperationId() { OP_COUNTER += 1; return "tabmut-" + Date.now() + "-" + OP_COUNTER; }
  function fail(code, message) { return { ok: false, errorCode: code, diagnostics: [{ code: code, message: message }] }; }

  return buildTabMovePlan;
});

define([
  "../config/mutationCodes.js",
  "../slots.js"
], function (_codes, _slots) {
  "use strict";

  var OP_COUNTER = 0;

  function buildTabMutationPlan(_state, _request) {
    var state = _state || {};
    var request = _request || {};
    var slots = _slots.listDashboardSlots(state);
    var resolved = resolveDeleteSlot(slots, request);
    var contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    if (!resolved) { return fail(_codes.APPLY_FAILED, "Delete target tab was not found."); }
    if (resolved.slot.isHelper === true || resolved.slot.visible !== true) { return fail(_codes.APPLY_FAILED, "Delete target is not a visible dashboard tab."); }
    if (_slots.countVisible(slots) <= readMinVisible(state)) { return fail(_codes.MIN_VISIBLE, "The last visible dashboard tab cannot be deleted."); }
    var slotMoves = buildSlotMoves(slots, resolved.tabIdx);
    var hideSlot = buildHideSlot(slots, state, request);
    var namesByIndexAfter = buildNamesByIndexAfter(slots, resolved.tabIdx, hideSlot);
    var landing = buildLanding(slots, resolved.tabIdx);
    var plan = Object.freeze({
      operation: "delete",
      operationId: createOperationId(),
      deletedSlot: { tabIdx: resolved.tabIdx, index: resolved.slot.index, tabId: resolved.slot.tabId },
      deletedName: resolved.slot.name || "",
      slotMoves: slotMoves,
      hideSlot: hideSlot,
      landing: landing,
      affectedTabIds: listAffectedTabIds(slotMoves, resolved.slot.tabId, hideSlot.tabId, landing.tabId),
      names: { byIndexAfter: namesByIndexAfter }
    });
    return { ok: true, plan: plan };
  }

  function resolveDeleteSlot(slots, request) {
    if (typeof request.tabId === "string" && request.tabId) {
      return findSlot(slots, function (slot) { return slot.tabId === request.tabId; });
    }
    if (typeof request.tabIndex === "number") {
      return findSlot(slots, function (slot, tabIdx) { return tabIdx === request.tabIndex || slot.index === request.tabIndex; });
    }
    return null;
  }

  function buildSlotMoves(slots, deletedTabIdx) {
    var moves = [];
    var lastVisibleTabIdx = _slots.countVisible(slots) - 1;
    for (var tabIdx = deletedTabIdx + 1; tabIdx <= lastVisibleTabIdx; tabIdx += 1) {
      moves.push(Object.freeze({
        fromIndex: slots[tabIdx].index, fromTabId: slots[tabIdx].tabId,
        fromTabIdx: tabIdx,
        toIndex: slots[tabIdx - 1].index, toTabId: slots[tabIdx - 1].tabId,
        toTabIdx: tabIdx - 1
      }));
    }
    return moves;
  }

  function buildHideSlot(slots, _state, request) {
    var tabIdx = _slots.countVisible(slots) - 1;
    var tab = slots[tabIdx] || {};
    var index = tab.index;
    // Never tab.name — after slotMoves that slot already holds the shifted-away deleted name.
    var baseline = readBaselineName(request, index) || "Tab " + (index + 1);
    return Object.freeze({ tabIdx: tabIdx, index: index, tabId: tab.tabId || null, baselineName: baseline });
  }

  function buildLanding(slots, deletedTabIdx) {
    var activeTabIdx = findActiveTabIdx(slots);
    // Landing must stay inside the visible prefix: compare against the last
    // VISIBLE position, not the last physical slot — with pre-existing hidden
    // slots the old check landed on a slot that is hidden after commit (B1).
    var lastVisibleTabIdx = _slots.countVisible(slots) - 1;
    var landingTabIdx = activeTabIdx === deletedTabIdx ? (deletedTabIdx < lastVisibleTabIdx ? deletedTabIdx : deletedTabIdx - 1) : (activeTabIdx > deletedTabIdx ? activeTabIdx - 1 : activeTabIdx);
    var landing = slots[Math.max(0, landingTabIdx)] || slots[0] || {};
    return Object.freeze({ tabIdx: landingTabIdx, index: landing.index, tabId: landing.tabId || null });
  }

  function buildNamesByIndexAfter(slots, deletedTabIdx, hideSlot) {
    var names = {};
    var lastVisibleTabIdx = _slots.countVisible(slots) - 1;
    for (var i = deletedTabIdx; i < lastVisibleTabIdx; i += 1) {
      names[String(slots[i].index)] = slots[i + 1].name;
    }
    names[String(hideSlot.index)] = hideSlot.baselineName;
    return Object.freeze(names);
  }

  function listAffectedTabIds(slotMoves, deletedTabId, hideTabId, landingTabId) {
    var seen = {};
    [deletedTabId, hideTabId, landingTabId].forEach(function (tabId) { if (tabId) { seen[tabId] = true; } });
    slotMoves.forEach(function (move) { if (move.fromTabId) { seen[move.fromTabId] = true; } if (move.toTabId) { seen[move.toTabId] = true; } });
    return Object.freeze(Object.keys(seen));
  }

  function readContiguousPrefixError(slots, state) {
    var minVisible = readMinVisible(state);
    var seenHidden = false;
    var visibleCount = 0;
    for (var i = 0; i < slots.length; i += 1) {
      if (slots[i].visible === true) { if (seenHidden) { return "Visible tabs must form a contiguous prefix."; } visibleCount += 1; continue; }
      seenHidden = true;
    }
    return visibleCount >= minVisible ? null : "Visible dashboard tabs are below the configured minimum.";
  }

  function readMinVisible(state) { return state.limits && typeof state.limits.minVisibleUserTabs === "number" ? state.limits.minVisibleUserTabs : 1; }
  function findActiveTabIdx(slots) { var idx = slots.findIndex(function (slot) { return slot.isActive === true; }); return idx >= 0 ? idx : 0; }
  function readBaselineName(request, index) {
    var runtimeMap = request.baselineNamesByIndex || {};
    return runtimeMap[String(index)] || null;
  }
  function findSlot(slots, matcher) { var tabIdx = slots.findIndex(matcher); return tabIdx < 0 ? null : { tabIdx: tabIdx, slot: slots[tabIdx] }; }
  function createOperationId() { OP_COUNTER += 1; return "tabmut-" + Date.now() + "-" + OP_COUNTER; }
  function fail(code, message) { return { ok: false, errorCode: code, diagnostics: [{ code: code, message: message }] }; }

  buildTabMutationPlan.countVisible = _slots.countVisible;
  buildTabMutationPlan.readContiguousPrefixError = readContiguousPrefixError;
  return buildTabMutationPlan;
});

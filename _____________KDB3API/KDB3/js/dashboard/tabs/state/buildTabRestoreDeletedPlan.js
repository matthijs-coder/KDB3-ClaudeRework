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

  function buildTabRestoreDeletedPlan(_state, _request) {
    var state = _state || {};
    var request = _request || {};
    var slots = _listDashboardSlots(state);
    var contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    var visibleCount = countVisible(slots);
    var maxUserTabs = state.limits && typeof state.limits.maxUserTabs === "number"
      ? state.limits.maxUserTabs : _defaults.MAX_USER_TABS;
    if (visibleCount >= maxUserTabs) { return fail(_codes.MAX_VISIBLE, "No hidden slot is available to reveal."); }
    var reveal = resolveRevealSlot(slots, request, visibleCount);
    if (!reveal.ok) { return reveal.result; }
    var insertTabIdx = request.insertTabIdx;
    if (typeof insertTabIdx !== "number" || !isFinite(insertTabIdx) || insertTabIdx < 0 || insertTabIdx > visibleCount) {
      return fail(_codes.APPLY_FAILED, "Restore insertTabIdx is outside the current visible prefix.");
    }
    var insertSource = slots[insertTabIdx];
    if (!insertSource) { return fail(_codes.APPLY_FAILED, "Restore insert slot was not found."); }
    if (insertSource.tabId !== request.tabId) {
      return fail(_codes.APPLY_FAILED, "Restore insertSlot.tabId does not match the deleted content tabId.");
    }
    var lastVisibleTabIdx = visibleCount - 1;
    var insertSlot = Object.freeze({ tabIdx: insertTabIdx, index: insertSource.index, tabId: insertSource.tabId });
    var revealSlot = reveal.slot;
    var slotMoves = buildSlotMoves(slots, insertTabIdx, lastVisibleTabIdx);
    var plan = Object.freeze({
      operation: "restoreDeleted",
      operationId: createOperationId(),
      revealSlot: revealSlot,
      insertSlot: insertSlot,
      slotMoves: slotMoves,
      landing: insertSlot,
      affectedTabIds: listAffectedTabIds(slotMoves, insertSlot.tabId, revealSlot.tabId),
      names: { byIndexAfter: buildNamesByIndexAfter(slots, request.name, insertTabIdx, lastVisibleTabIdx, revealSlot) },
      restore: {
        filters: {
          singleSelect: cloneJson(request.filters && request.filters.singleSelect || {}),
          dienststelle: cloneJson(request.filters && request.filters.dienststelle || {}),
          nativeMultiSelect: cloneJson(request.filters && request.filters.nativeMultiSelect || [])
        }
      }
    });
    return { ok: true, plan: plan };
  }

  function resolveRevealSlot(slots, request, visibleCount) {
    var hideTabId = request.hideSlot && request.hideSlot.tabId;
    var found = hideTabId ? findSlot(slots, function (slot) { return slot.tabId === hideTabId; }) : null;
    if (!found) { return { ok: false, result: fail(_codes.APPLY_FAILED, "Restore hideSlot.tabId was not found.") }; }
    if (found.slot.visible === true) { return { ok: false, result: fail(_codes.APPLY_FAILED, "Restore hideSlot is currently visible.") }; }
    if (found.slot.isHelper === true) { return { ok: false, result: fail(_codes.APPLY_FAILED, "Restore hideSlot is not a dashboard tab.") }; }
    if (found.tabIdx !== visibleCount) {
      return { ok: false, result: fail(_codes.APPLY_FAILED, "Restore reveal slot is not the first hidden dashboard slot.") };
    }
    return {
      ok: true,
      slot: Object.freeze({ tabIdx: found.tabIdx, index: found.slot.index, tabId: found.slot.tabId || null })
    };
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

  function buildNamesByIndexAfter(slots, restoredName, insertTabIdx, lastVisibleTabIdx, revealSlot) {
    var names = {};
    names[String(slots[insertTabIdx].index)] = restoredName || "";
    for (var tabIdx = insertTabIdx + 1; tabIdx <= lastVisibleTabIdx; tabIdx += 1) {
      names[String(slots[tabIdx].index)] = slots[tabIdx - 1].name;
    }
    if (revealSlot.index !== slots[insertTabIdx].index) {
      names[String(revealSlot.index)] = slots[lastVisibleTabIdx].name;
    }
    return Object.freeze(names);
  }

  function listAffectedTabIds(slotMoves, insertTabId, revealTabId) {
    var seen = {};
    [insertTabId, revealTabId].forEach(function (tabId) { if (tabId) { seen[tabId] = true; } });
    slotMoves.forEach(function (move) { if (move.fromTabId) { seen[move.fromTabId] = true; } if (move.toTabId) { seen[move.toTabId] = true; } });
    return Object.freeze(Object.keys(seen));
  }

  function cloneJson(_value) {
    return JSON.parse(JSON.stringify(_value));
  }

  function findSlot(slots, matcher) { var tabIdx = slots.findIndex(matcher); return tabIdx < 0 ? null : { tabIdx: tabIdx, slot: slots[tabIdx] }; }
  function createOperationId() { OP_COUNTER += 1; return "tabmut-" + Date.now() + "-" + OP_COUNTER; }
  function fail(code, message) { return { ok: false, errorCode: code, diagnostics: [{ code: code, message: message }] }; }

  return buildTabRestoreDeletedPlan;
});

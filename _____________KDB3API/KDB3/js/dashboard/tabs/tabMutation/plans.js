define([
  "../config/mutationCodes.js",
  "../config/defaults.js",
  "../slots.js",
  "../../../core/utils/kit/data.js"
], function (_codes, _defaults, _slots, _data) {
  "use strict";

  // Pure plan builders for delete / duplicate / move / restoreDeleted. Positions: tabIdx is the position in the
  // dashboard slot list, index the physical Cognos tab index. Visible slots always form a contiguous prefix.
  // request.operationSeq (the tabs mutation run id) makes operationId unique per dashboard.

  function buildDeletePlan(_state, _request) {
    const state = _state || {};
    const request = _request || {};
    const slots = _slots.listDashboardSlots(state);
    const resolved = resolveRequestedSlot(slots, request);
    const contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    if (!resolved) { return fail(_codes.APPLY_FAILED, "Delete target tab was not found."); }
    if (resolved.slot.isHelper === true || resolved.slot.visible !== true) {
      return fail(_codes.APPLY_FAILED, "Delete target is not a visible dashboard tab.");
    }
    if (_slots.countVisible(slots) <= readMinVisible(state)) {
      return fail(_codes.MIN_VISIBLE, "The last visible dashboard tab cannot be deleted.");
    }
    const deletedTabIdx = resolved.tabIdx;
    const lastVisibleTabIdx = _slots.countVisible(slots) - 1;
    const slotMoves = [];
    for (let tabIdx = deletedTabIdx + 1; tabIdx <= lastVisibleTabIdx; tabIdx += 1) {
      slotMoves.push(freezeMove(slots, tabIdx, tabIdx - 1));
    }
    const hideSlot = buildDeleteHideSlot(slots, request);
    const landing = buildDeleteLanding(slots, deletedTabIdx);
    const names = {};
    for (let tabIdx = deletedTabIdx; tabIdx < lastVisibleTabIdx; tabIdx += 1) {
      names[String(slots[tabIdx].index)] = slots[tabIdx + 1].name;
    }
    names[String(hideSlot.index)] = hideSlot.baselineName;
    return succeed({
      operation: "delete",
      operationId: createOperationId(request),
      deletedSlot: { tabIdx: deletedTabIdx, index: resolved.slot.index, tabId: resolved.slot.tabId },
      deletedName: resolved.slot.name || "",
      slotMoves: slotMoves,
      hideSlot: hideSlot,
      landing: landing,
      affectedTabIds: listAffectedTabIds(slotMoves, [resolved.slot.tabId, hideSlot.tabId, landing.tabId]),
      names: { byIndexAfter: Object.freeze(names) }
    });
  }

  function buildDeleteHideSlot(slots, request) {
    const tabIdx = _slots.countVisible(slots) - 1;
    const tab = slots[tabIdx] || {};
    const baselineNamesByIndex = request.baselineNamesByIndex || {};
    // Never tab.name: after the slot moves that slot holds the shifted-away deleted name.
    const baselineName = baselineNamesByIndex[String(tab.index)] || "Tab " + (tab.index + 1);
    return Object.freeze({ tabIdx: tabIdx, index: tab.index, tabId: tab.tabId || null, baselineName: baselineName });
  }

  // Landing stays inside the visible prefix after the delete, also with pre-existing hidden slots.
  function buildDeleteLanding(slots, deletedTabIdx) {
    const activeTabIdx = findActiveTabIdx(slots);
    const lastVisibleTabIdx = _slots.countVisible(slots) - 1;
    let landingTabIdx = activeTabIdx > deletedTabIdx ? activeTabIdx - 1 : activeTabIdx;
    if (activeTabIdx === deletedTabIdx) {
      landingTabIdx = deletedTabIdx < lastVisibleTabIdx ? deletedTabIdx : deletedTabIdx - 1;
    }
    const landing = slots[Math.max(0, landingTabIdx)] || slots[0] || {};
    return Object.freeze({ tabIdx: landingTabIdx, index: landing.index, tabId: landing.tabId || null });
  }

  // Inserts a copy right of the source and reveals the first hidden slot at the end of the visible prefix.
  function buildDuplicatePlan(_state, _request) {
    const state = _state || {};
    const request = _request || {};
    const slots = _slots.listDashboardSlots(state);
    const contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    const source = resolveRequestedSlot(slots, request);
    if (!source) { return fail(_codes.APPLY_FAILED, "Duplicate source tab was not found."); }
    if (source.slot.isHelper === true || source.slot.visible !== true) {
      return fail(_codes.APPLY_FAILED, "Duplicate source is not a visible dashboard tab.");
    }
    const visibleCount = _slots.countVisible(slots);
    if (visibleCount >= readMaxUserTabs(state)) { return fail(_codes.MAX_VISIBLE, "No hidden slot is available to reveal."); }
    const revealSource = slots[visibleCount];
    if (!revealSource) { return fail(_codes.MAX_VISIBLE, "No hidden slot is available to reveal."); }
    const insertTabIdx = source.tabIdx + 1;
    const lastVisibleTabIdx = visibleCount - 1;
    const sourceSlot = Object.freeze({ tabIdx: source.tabIdx, index: source.slot.index, tabId: source.slot.tabId });
    const insertSlot = Object.freeze({ tabIdx: insertTabIdx, index: slots[insertTabIdx].index, tabId: slots[insertTabIdx].tabId });
    const revealSlot = Object.freeze({ tabIdx: visibleCount, index: revealSource.index, tabId: revealSource.tabId || null });
    const slotMoves = buildShiftRightMoves(slots, insertTabIdx, lastVisibleTabIdx);
    return succeed({
      operation: "duplicate",
      operationId: createOperationId(request),
      sourceSlot: sourceSlot,
      revealSlot: revealSlot,
      insertSlot: insertSlot,
      slotMoves: slotMoves,
      clonePair: Object.freeze({ from: sourceSlot, to: insertSlot }),
      landing: sourceSlot,
      affectedTabIds: listAffectedTabIds(slotMoves, [sourceSlot.tabId, insertSlot.tabId, revealSlot.tabId]),
      names: { byIndexAfter: buildInsertNames(slots, source.slot.name, insertTabIdx, lastVisibleTabIdx, revealSlot, true) }
    });
  }

  // Moves the source from position s to position d; the slots in between shift by one towards s.
  function buildMovePlan(_state, _request) {
    const state = _state || {};
    const request = _request || {};
    const slots = _slots.listDashboardSlots(state);
    const contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    const source = resolveRequestedSlot(slots, request);
    if (!source) { return fail(_codes.APPLY_FAILED, "Move source tab was not found."); }
    if (source.slot.isHelper === true || source.slot.visible !== true) {
      return fail(_codes.APPLY_FAILED, "Move source is not a visible dashboard tab.");
    }
    const d = request.targetPosition;
    if (typeof d !== "number" || d < 0 || d >= _slots.countVisible(slots)) {
      return fail(_codes.APPLY_FAILED, "Move target position is out of range.");
    }
    if (slots[d].visible !== true) { return fail(_codes.APPLY_FAILED, "Move target is not a visible dashboard tab."); }
    const s = source.tabIdx;
    if (s === d) { return fail(_codes.SAME_POSITION, "Source and target positions are identical."); }
    const slotMoves = [freezeMove(slots, s, d)];
    for (let tabIdx = Math.min(s, d); tabIdx <= Math.max(s, d); tabIdx += 1) {
      if (s < d && tabIdx > s) { slotMoves.push(freezeMove(slots, tabIdx, tabIdx - 1)); }
      if (s > d && tabIdx < s) { slotMoves.push(freezeMove(slots, tabIdx, tabIdx + 1)); }
    }
    const landing = buildMoveLanding(slots, s, d);
    return succeed({
      operation: "move",
      operationId: createOperationId(request),
      sourceSlot: Object.freeze({ tabIdx: s, index: source.slot.index, tabId: source.slot.tabId }),
      targetTabIdx: d,
      slotMoves: slotMoves,
      landing: landing,
      affectedTabIds: listAffectedTabIds(slotMoves, [source.slot.tabId, landing.tabId]),
      names: { byIndexAfter: buildMoveNames(slots, s, d) }
    });
  }

  function buildMoveNames(slots, s, d) {
    const names = {};
    for (let tabIdx = Math.min(s, d); tabIdx <= Math.max(s, d); tabIdx += 1) {
      let sourceTabIdx = tabIdx;
      if (tabIdx === d) {
        sourceTabIdx = s;
      } else if (s < d && tabIdx >= s && tabIdx < d) {
        sourceTabIdx = tabIdx + 1;
      } else if (s > d && tabIdx > d && tabIdx <= s) {
        sourceTabIdx = tabIdx - 1;
      }
      names[String(slots[tabIdx].index)] = slots[sourceTabIdx].name;
    }
    return Object.freeze(names);
  }

  function buildMoveLanding(slots, s, d) {
    const activeTabIdx = findActiveTabIdx(slots);
    let landingTabIdx = activeTabIdx;
    if (activeTabIdx === s) {
      landingTabIdx = d;
    } else if (s < d && activeTabIdx > s && activeTabIdx <= d) {
      landingTabIdx = activeTabIdx - 1;
    } else if (s > d && activeTabIdx >= d && activeTabIdx < s) {
      landingTabIdx = activeTabIdx + 1;
    }
    const landing = slots[landingTabIdx] || slots[0] || {};
    return Object.freeze({ tabIdx: landingTabIdx, index: landing.index, tabId: landing.tabId || null });
  }

  // Undo of a delete: re-inserts the deleted content tab at insertTabIdx and reveals the slot the delete hid.
  function buildRestoreDeletedPlan(_state, _request) {
    const state = _state || {};
    const request = _request || {};
    const slots = _slots.listDashboardSlots(state);
    const contiguousError = readContiguousPrefixError(slots, state);
    if (contiguousError) { return fail(_codes.POSTCONDITION_FAILED, contiguousError); }
    const visibleCount = _slots.countVisible(slots);
    if (visibleCount >= readMaxUserTabs(state)) { return fail(_codes.MAX_VISIBLE, "No hidden slot is available to reveal."); }
    const reveal = resolveRestoreRevealSlot(slots, request, visibleCount);
    if (!reveal.ok) { return reveal.result; }
    const insertTabIdx = request.insertTabIdx;
    if (typeof insertTabIdx !== "number" || !isFinite(insertTabIdx) || insertTabIdx < 0 || insertTabIdx > visibleCount) {
      return fail(_codes.APPLY_FAILED, "Restore insertTabIdx is outside the current visible prefix.");
    }
    const insertSource = slots[insertTabIdx];
    if (!insertSource) { return fail(_codes.APPLY_FAILED, "Restore insert slot was not found."); }
    if (insertSource.tabId !== request.tabId) {
      return fail(_codes.APPLY_FAILED, "Restore insertSlot.tabId does not match the deleted content tabId.");
    }
    const lastVisibleTabIdx = visibleCount - 1;
    const insertSlot = Object.freeze({ tabIdx: insertTabIdx, index: insertSource.index, tabId: insertSource.tabId });
    const slotMoves = buildShiftRightMoves(slots, insertTabIdx, lastVisibleTabIdx);
    const filters = request.filters || {};
    return succeed({
      operation: "restoreDeleted",
      operationId: createOperationId(request),
      revealSlot: reveal.slot,
      insertSlot: insertSlot,
      slotMoves: slotMoves,
      landing: insertSlot,
      affectedTabIds: listAffectedTabIds(slotMoves, [insertSlot.tabId, reveal.slot.tabId]),
      names: { byIndexAfter: buildInsertNames(slots, request.name || "", insertTabIdx, lastVisibleTabIdx, reveal.slot, false) },
      restore: {
        filters: {
          singleSelect: _data.cloneJson(filters.singleSelect || {}),
          dienststelle: _data.cloneJson(filters.dienststelle || {}),
          nativeMultiSelect: _data.cloneJson(filters.nativeMultiSelect || [])
        }
      }
    });
  }

  function resolveRestoreRevealSlot(slots, request, visibleCount) {
    const hideTabId = request.hideSlot && request.hideSlot.tabId;
    const found = hideTabId ? findSlot(slots, function (slot) { return slot.tabId === hideTabId; }) : null;
    let message = null;
    if (!found) {
      message = "Restore hideSlot.tabId was not found.";
    } else if (found.slot.visible === true) {
      message = "Restore hideSlot is currently visible.";
    } else if (found.slot.isHelper === true) {
      message = "Restore hideSlot is not a dashboard tab.";
    } else if (found.tabIdx !== visibleCount) {
      message = "Restore reveal slot is not the first hidden dashboard slot.";
    }
    if (message) { return { ok: false, result: fail(_codes.APPLY_FAILED, message) }; }
    return { ok: true, slot: Object.freeze({ tabIdx: found.tabIdx, index: found.slot.index, tabId: found.slot.tabId || null }) };
  }

  // Names after inserting insertedName at insertTabIdx: the visible tail shifts right into the revealed slot.
  // A restore whose reveal slot is the insert slot itself keeps the inserted name there.
  function buildInsertNames(slots, insertedName, insertTabIdx, lastVisibleTabIdx, revealSlot, alwaysNameReveal) {
    const names = {};
    names[String(slots[insertTabIdx].index)] = insertedName;
    for (let tabIdx = insertTabIdx + 1; tabIdx <= lastVisibleTabIdx; tabIdx += 1) {
      names[String(slots[tabIdx].index)] = slots[tabIdx - 1].name;
    }
    if (alwaysNameReveal || revealSlot.index !== slots[insertTabIdx].index) {
      names[String(revealSlot.index)] = slots[lastVisibleTabIdx].name;
    }
    return Object.freeze(names);
  }

  function buildShiftRightMoves(slots, insertTabIdx, lastVisibleTabIdx) {
    const moves = [];
    for (let tabIdx = lastVisibleTabIdx; tabIdx >= insertTabIdx; tabIdx -= 1) {
      moves.push(freezeMove(slots, tabIdx, tabIdx + 1));
    }
    return moves;
  }

  function freezeMove(slots, fromTabIdx, toTabIdx) {
    return Object.freeze({
      fromIndex: slots[fromTabIdx].index,
      fromTabId: slots[fromTabIdx].tabId,
      fromTabIdx: fromTabIdx,
      toIndex: slots[toTabIdx].index,
      toTabId: slots[toTabIdx].tabId,
      toTabIdx: toTabIdx
    });
  }

  function listAffectedTabIds(slotMoves, leadingTabIds) {
    const seen = {};
    leadingTabIds.forEach(function (tabId) { if (tabId) { seen[tabId] = true; } });
    slotMoves.forEach(function (move) {
      if (move.fromTabId) { seen[move.fromTabId] = true; }
      if (move.toTabId) { seen[move.toTabId] = true; }
    });
    return Object.freeze(Object.keys(seen));
  }

  function readContiguousPrefixError(slots, state) {
    let seenHidden = false;
    let visibleCount = 0;
    for (let tabIdx = 0; tabIdx < slots.length; tabIdx += 1) {
      if (slots[tabIdx].visible !== true) {
        seenHidden = true;
        continue;
      }
      if (seenHidden) { return "Visible tabs must form a contiguous prefix."; }
      visibleCount += 1;
    }
    return visibleCount >= readMinVisible(state) ? null : "Visible dashboard tabs are below the configured minimum.";
  }

  function resolveRequestedSlot(slots, request) {
    if (typeof request.tabId === "string" && request.tabId) {
      return findSlot(slots, function (slot) { return slot.tabId === request.tabId; });
    }
    if (typeof request.tabIndex === "number") {
      return findSlot(slots, function (slot, tabIdx) { return tabIdx === request.tabIndex || slot.index === request.tabIndex; });
    }
    return null;
  }

  function findSlot(slots, matcher) {
    const tabIdx = slots.findIndex(matcher);
    return tabIdx < 0 ? null : { tabIdx: tabIdx, slot: slots[tabIdx] };
  }

  function findActiveTabIdx(slots) {
    const tabIdx = slots.findIndex(function (slot) { return slot.isActive === true; });
    return tabIdx >= 0 ? tabIdx : 0;
  }

  function readMinVisible(state) {
    return state.limits && typeof state.limits.minVisibleUserTabs === "number" ? state.limits.minVisibleUserTabs : 1;
  }

  function readMaxUserTabs(state) {
    return state.limits && typeof state.limits.maxUserTabs === "number" ? state.limits.maxUserTabs : _defaults.MAX_USER_TABS;
  }

  function createOperationId(request) {
    return "tabmut-" + Date.now() + "-" + (request.operationSeq || 0);
  }

  function succeed(plan) {
    return { ok: true, plan: Object.freeze(plan) };
  }

  function fail(code, message) {
    return { ok: false, errorCode: code, diagnostics: [{ code: code, message: message }] };
  }

  return {
    buildDeletePlan: buildDeletePlan,
    buildDuplicatePlan: buildDuplicatePlan,
    buildMovePlan: buildMovePlan,
    buildRestoreDeletedPlan: buildRestoreDeletedPlan
  };
});

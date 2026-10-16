define([
  "./guardTabMutation.js",
  "../effects/fillDuplicateWidgetContent.js",
  "../effects/rebuildSlotFromEntries.js",
  "./ensureRevealTakeTarget.js"
], function (_support, _fillDuplicateWidgetContent, _rebuildSlotFromEntries, _ensureRevealTakeTarget) {
  "use strict";

  async function applyTabMutationDuplicate(_context, payload, plan, snapshot, parked, moved) {
    var created = [];
    var degradedEntries = [];
    if (!plan.insertSlot || !plan.insertSlot.tabId) {
      return structuralFail(parked, moved, "duplicate plan missing insertSlot.tabId");
    }
    if (!snapshot.rebuildByTabId || typeof snapshot.rebuildByTabId !== "object") {
      return structuralFail(parked, moved, "duplicate prepare snapshot missing rebuildByTabId");
    }
    var placeOptions = buildPlaceOptions(payload, "tabDuplicate");
    var keys = Object.keys(snapshot.rebuildByTabId);
    var index = 0;
    while (index < keys.length) {
      var tabId = keys[index];
      var rows = Array.isArray(snapshot.rebuildByTabId[tabId]) ? snapshot.rebuildByTabId[tabId] : [];
      if (rows.length === 0 && !isSlotMoveFrom(plan, tabId)) {
        index += 1;
        continue;
      }
      var slotResult = await rebuildDestination(_context, plan, tabId, rows, parked, moved, placeOptions, payload.runId);
      recordCreated(snapshot, slotResult && slotResult.created);
      if (!slotResult || slotResult.ok !== true || slotResult.structural || slotResult.superseded) {
        return structuralFail(parked, moved, slotResult && slotResult.message ? slotResult.message : "widgetBase tab mutation superseded during duplicate apply");
      }
      created = created.concat(slotResult.created || []);
      degradedEntries = degradedEntries.concat(slotResult.degradedEntries || []);
      if (slotResult.created && slotResult.created.length > 0) {
        if (_support.isStale(_context._KDB, payload.runId)) {
          return structuralFail(parked, moved, "widgetBase tab mutation superseded during duplicate apply");
        }
        var fillResult = await _fillDuplicateWidgetContent(_context, slotResult.created, rows);
        degradedEntries = degradedEntries.concat(fillResult && fillResult.degraded || []);
      }
      index += 1;
    }
    return { ok: true, operationId: payload.operationId, moved: moved, parked: parked, created: created, degradedEntries: degradedEntries, diagnostics: [] };
  }

  async function rebuildDestination(_context, _plan, _tabId, _rows, _parked, _moved, _placeOptions, _runId) {
    return _rebuildSlotFromEntries(_context, _tabId, _rows, {
      routeWidget: routeWidget,
      ensureRevealTakeTarget: _ensureRevealTakeTarget,
      revealSlot: _plan.revealSlot || null,
      parked: _parked,
      moved: _moved,
      placeOptions: _placeOptions,
      isStale: _support.isStale,
      runId: _runId,
      plan: _plan
    });
  }

  function buildPlaceOptions(payload, reason) {
    return {
      guard: { kind: "tabMutationRunId", runId: payload.runId },
      reason: reason,
      source: "tabsMutation",
      skipHistory: true,
      isHistoryReplay: true,
      restorePayload: { source: "tabsMutation", skipHistory: true, runId: payload.runId }
    };
  }

  function isSlotMoveFrom(_plan, _tabId) {
    var moves = _plan.slotMoves || [];
    var index = 0;
    while (index < moves.length) {
      if (moves[index].fromTabId === _tabId) { return true; }
      index += 1;
    }
    return false;
  }

  function recordCreated(_snapshot, _created) {
    var created = _created || [];
    var index = 0;
    if (!_snapshot.createdWidgetIds) { _snapshot.createdWidgetIds = []; }
    while (index < created.length) {
      if (created[index] && created[index].widgetId) { _snapshot.createdWidgetIds.push(created[index].widgetId); }
      index += 1;
    }
  }

  async function routeWidget(_context, widgetId, tabId, parked, reason, hints) {
    var payload = { widgetId: widgetId, tabId: tabId, reason: reason, isHistoryReplay: true };
    if (hints && hints.visualType) { payload.visualType = hints.visualType; }
    if (hints && hints.isTopNHelperClaim === true) { payload.isTopNHelperClaim = true; }
    var result = await _context.dispatch({
      type: _context.actionTypes.ROUTE_TO_LAUNCHPAD,
      widgetId: widgetId,
      payload: payload
    });
    if (!result || result.ok !== true) { throw new Error("Failed to route widget " + widgetId + " to launchpad."); }
    parked.push(widgetId);
  }

  function structuralFail(parked, moved, message) {
    return { ok: false, moved: moved, parked: parked, diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: message }] };
  }

  return {
    applyTabMutationDuplicate: applyTabMutationDuplicate, rebuildDestination: rebuildDestination,
    buildPlaceOptions: buildPlaceOptions, recordCreated: recordCreated
  };
});

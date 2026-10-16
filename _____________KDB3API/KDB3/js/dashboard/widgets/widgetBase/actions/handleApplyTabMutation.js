define([
  "./guardTabMutation.js",
  "./applyTabMutationDuplicate.js",
  "./applyTabMutationRestoreDeleted.js",
  "../effects/applyDeleteSlotStock.js",
  "../effects/applyMoveSlotStock.js",
  "../effects/fillDuplicateWidgetContent.js"
], function (_support, _duplicate, _restore, _applyDeleteSlotStock, _applyUserMove, _fillDuplicateWidgetContent) {
  "use strict";

  async function handleApplyTabMutation(_context, _action) {
    var moved = [];
    var parked = [];
    try {
      var payload = _action && _action.payload || {};
      var guard = _support.guardRun(_context._KDB, payload);
      if (guard) { return guard; }
      var plan = payload.plan || {};
      var operation = plan.operation;
      if (operation !== "delete" && operation !== "move" && operation !== "duplicate" && operation !== "restoreDeleted") {
        return { ok: false, moved: moved, parked: parked, diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: "widgetBase tab mutation apply supports delete, move, duplicate, and restoreDeleted." }] };
      }
      var snapshot = _support.readSnapshot(_context._KDB, payload.operationId);
      if (snapshot) { snapshot.physicalStarted = true; }
      if (operation === "duplicate") {
        return await _duplicate.applyTabMutationDuplicate(_context, payload, plan, snapshot || {}, parked, moved);
      }
      if (operation === "restoreDeleted") {
        return await _restore.applyTabMutationRestoreDeleted(_context, payload, plan, snapshot || {}, parked, moved);
      }
      if (operation === "delete") {
        if (payload.widgetRebuild === true) {
          return await applyWidgetRebuildDelete(_context, payload, plan, snapshot || {}, parked, moved);
        }
        return await _applyDeleteSlotStock.applyUserDelete(_context, payload, plan, snapshot || {}, parked, moved);
      }
      return await _applyUserMove(_context, payload, plan, snapshot || {}, parked, moved);
    } catch (err) {
      return { ok: false, moved: moved, parked: parked, diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: String(err && err.message ? err.message : err) }] };
    }
  }

  async function applyWidgetRebuildDelete(_context, payload, plan, snapshot, parked, moved) {
    var created = [];
    var degradedEntries = [];
    var hideTabId = plan.hideSlot && plan.hideSlot.tabId;
    var placeOptions = _duplicate.buildPlaceOptions(payload, "tabDelete");
    if (hideTabId) {
      var hideResult = await _duplicate.rebuildDestination(_context, plan, hideTabId, [], parked, moved, placeOptions, payload.runId);
      if (!hideResult || hideResult.ok !== true) {
        return { ok: false, moved: moved, parked: parked, diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: hideResult && hideResult.message ? hideResult.message : "widget rebuild failed to park the hidden slot." }] };
      }
    }
    var rebuildMap = snapshot.rebuildByTabId || {};
    var keys = Object.keys(rebuildMap);
    var index = 0;
    while (index < keys.length) {
      if (keys[index] !== hideTabId) {
        var rows = Array.isArray(rebuildMap[keys[index]]) ? rebuildMap[keys[index]] : [];
        var slotResult = await _duplicate.rebuildDestination(_context, plan, keys[index], rows, parked, moved, placeOptions, payload.runId);
        _duplicate.recordCreated(snapshot, slotResult && slotResult.created);
        if (!slotResult || slotResult.ok !== true || slotResult.structural || slotResult.superseded) {
          return { ok: false, moved: moved, parked: parked, diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: slotResult && slotResult.message ? slotResult.message : "widget rebuild failed." }] };
        }
        created = created.concat(slotResult.created || []);
        degradedEntries = degradedEntries.concat(slotResult.degradedEntries || []);
        if (slotResult.created && slotResult.created.length > 0) {
          if (_support.isStale(_context._KDB, payload.runId)) {
            return { ok: false, moved: moved, parked: parked, diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: "widgetBase tab mutation superseded during widget rebuild." }] };
          }
          var fillResult = await _fillDuplicateWidgetContent(_context, slotResult.created, rows);
          degradedEntries = degradedEntries.concat(fillResult && fillResult.degraded || []);
        }
      }
      index += 1;
    }
    return { ok: true, operationId: payload.operationId, moved: moved, parked: parked, created: created, degradedEntries: degradedEntries, diagnostics: [] };
  }

  return handleApplyTabMutation;
});

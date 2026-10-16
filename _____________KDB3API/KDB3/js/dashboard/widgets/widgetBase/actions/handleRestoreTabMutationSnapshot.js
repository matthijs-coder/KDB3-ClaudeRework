define([
  "./guardTabMutation.js",
  "./parkCreatedWidgetsForRollback.js",
  "../../../tabs/config/mutationCodes.js",
  "./applyTabMutationDuplicate.js"
], function (_support, _parkCreated, _codes, _duplicate) {
  "use strict";

  async function handleRestoreTabMutationSnapshot(_context, _action) {
    var restored = [];
    var unrecoverable = [];
    var payload = _action && _action.payload || {};
    try {
      var snapshot = _support.readSnapshot(_context._KDB, payload.operationId);
      if (!snapshot) { return { ok: true, operationId: payload.operationId, restored: restored, unrecoverable: unrecoverable, diagnostics: [] }; }
      if (snapshot.physicalStarted !== true) {
        restoreFrames(_context, snapshot.byId, restored);
        _support.deleteSnapshot(_context._KDB, payload.operationId);
        return { ok: true, operationId: payload.operationId, restored: restored, unrecoverable: unrecoverable, diagnostics: [] };
      }
      if (isContentRebuildRollback(snapshot)) {
        if (Array.isArray(snapshot.createdWidgetIds) && snapshot.createdWidgetIds.length) {
          await _parkCreated(_context, snapshot.createdWidgetIds, unrecoverable);
        }
        await rebuildRollback(_context, snapshot, payload);
        _support.deleteSnapshot(_context._KDB, payload.operationId);
        return {
          ok: unrecoverable.length === 0,
          operationId: payload.operationId,
          restored: restored,
          unrecoverable: unrecoverable,
          diagnostics: unrecoverable.length ? [{ code: _codes.ROLLBACK_INCOMPLETE, message: "Some widgets could not be restored." }] : []
        };
      }
      await restoreFromSnapshot(_context, snapshot, restored, unrecoverable);
      if (Array.isArray(snapshot.createdWidgetIds) && snapshot.createdWidgetIds.length) {
        await _parkCreated(_context, snapshot.createdWidgetIds, unrecoverable);
      }
      restoreFrames(_context, snapshot.byId, restored);
      _support.deleteSnapshot(_context._KDB, payload.operationId);
      return {
        ok: unrecoverable.length === 0,
        operationId: payload.operationId,
        restored: restored,
        unrecoverable: unrecoverable,
        diagnostics: unrecoverable.length ? [{ code: _codes.ROLLBACK_INCOMPLETE, message: "Some widgets could not be restored." }] : []
      };
    } catch (err) {
      _support.deleteSnapshot(_context._KDB, payload.operationId);
      return { ok: false, operationId: payload.operationId, restored: restored, unrecoverable: unrecoverable, diagnostics: [{ code: _codes.ROLLBACK_INCOMPLETE, message: String(err && err.message ? err.message : err) }] };
    }
  }

  function isContentRebuildRollback(snapshot) {
    return snapshot.plan && snapshot.plan.operation === "duplicate" || snapshot.widgetRebuild === true || snapshot.slotStockRebuild === true;
  }

  async function rebuildRollback(_context, snapshot, payload) {
    var map = snapshot.rollbackByTabId || {};
    var keys = Object.keys(map);
    var placeOptions = _duplicate.buildPlaceOptions(payload, "rollback");
    var parked = [];
    var moved = [];
    var index = 0;
    while (index < keys.length) {
      var rows = Array.isArray(map[keys[index]]) ? map[keys[index]] : [];
      var result = await _duplicate.rebuildDestination(_context, snapshot.plan || {}, keys[index], rows, parked, moved, placeOptions, payload.runId);
      if (!result || result.ok !== true || result.structural || result.superseded) {
        throw new Error(result && result.message ? result.message : "rollback rebuild failed");
      }
      index += 1;
    }
  }

  async function restoreFromSnapshot(_context, snapshot, restored, unrecoverable) {
    var byId = snapshot.byId || {};
    var widgetIds = Object.keys(byId);
    for (var i = 0; i < widgetIds.length; i += 1) {
      var widgetId = widgetIds[i];
      var frame = byId[widgetId];
      if (!frame || frame.placement !== "onCanvas") { continue; }
      var current = _context.selectors.readFrame(_context._KDB, widgetId);
      if (current && current.placement === "onCanvas") {
        var routed = await _context.dispatch({ type: _context.actionTypes.ROUTE_TO_LAUNCHPAD, widgetId: widgetId, payload: { widgetId: widgetId, tabId: current.tabId, reason: "rollback", isHistoryReplay: true } });
        if (!routed || routed.ok !== true) { unrecoverable.push(widgetId); continue; }
      }
      var placed = await _context.dispatch({ type: _context.actionTypes.TAKE_FROM_LAUNCHPAD, widgetId: widgetId, payload: { tabId: frame.tabId, reason: "rollback", isHistoryReplay: true } });
      if (!placed || placed.ok !== true) { unrecoverable.push(widgetId); } else { restored.push(widgetId); }
    }
  }

  function restoreFrames(_context, byId, restored) {
    Object.keys(byId || {}).forEach(function (widgetId) {
      _context.dispatchInternal({
        type: _context.actionTypes.REGISTER_FRAME,
        payload: { widgetId: widgetId, frame: byId[widgetId] }
      });
      restored.push(widgetId);
    });
  }

  // Rollback restores frames only; routedTabIds stays one-way via mount-seed
  // and mayMarkRouted (widgetBase delta §3) and is never written here (B2).

  return handleRestoreTabMutationSnapshot;
});

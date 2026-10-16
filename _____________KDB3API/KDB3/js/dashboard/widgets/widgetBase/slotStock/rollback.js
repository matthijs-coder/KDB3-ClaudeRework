define([
  "./guard.js",
  "./apply.js",
  "../../../tabs/config/mutationCodes.js"
], function (_guard, _apply, _codes) {
  "use strict";

  // Rollback restores frames only; routedTabIds stays one-way via mount-seed and mayMarkRouted and is never written here.

  function rollbackResult(_operationId, _restored, _unrecoverable) {
    return {
      ok: _unrecoverable.length === 0,
      operationId: _operationId,
      restored: _restored,
      unrecoverable: _unrecoverable,
      diagnostics: _unrecoverable.length ? [{ code: _codes.ROLLBACK_INCOMPLETE, message: "Some widgets could not be restored." }] : []
    };
  }

  function isContentRebuildRollback(_snapshot) {
    return _snapshot.plan && _snapshot.plan.operation === "duplicate" || _snapshot.widgetRebuild === true || _snapshot.slotStockRebuild === true;
  }

  async function parkCreatedWidgets(_context, _createdWidgetIds, _unrecoverable) {
    if (!Array.isArray(_createdWidgetIds) || _createdWidgetIds.length === 0) { return; }
    for (var index = 0; index < _createdWidgetIds.length; index += 1) {
      var widgetId = _createdWidgetIds[index];
      var current = _context.selectors.readFrame(_context._KDB, widgetId);
      if (!current || current.placement !== "onCanvas") { continue; }
      var routed = await _context.dispatch({
        type: _context.actionTypes.ROUTE_TO_LAUNCHPAD,
        widgetId: widgetId,
        payload: { widgetId: widgetId, tabId: current.tabId, reason: "rollback", isHistoryReplay: true }
      });
      if (!routed || routed.ok !== true) { _unrecoverable.push(widgetId); }
    }
  }

  async function rebuildRollback(_context, _snapshot, _payload) {
    var map = _snapshot.rollbackByTabId || {};
    var placeOptions = _apply.buildPlaceOptions(_payload, "rollback");
    var parked = [];
    var keys = Object.keys(map);
    for (var index = 0; index < keys.length; index += 1) {
      var rows = Array.isArray(map[keys[index]]) ? map[keys[index]] : [];
      var result = await _apply.rebuildDestination(_context, _snapshot.plan || {}, keys[index], rows, parked, placeOptions, _payload.runId);
      if (!result || result.ok !== true || result.structural || result.superseded) {
        throw new Error(result && result.message ? result.message : "rollback rebuild failed");
      }
    }
  }

  async function restoreFromSnapshot(_context, _snapshot, _restored, _unrecoverable) {
    var byId = _snapshot.byId || {};
    var widgetIds = Object.keys(byId);
    for (var index = 0; index < widgetIds.length; index += 1) {
      var widgetId = widgetIds[index];
      var frame = byId[widgetId];
      if (!frame || frame.placement !== "onCanvas") { continue; }
      var current = _context.selectors.readFrame(_context._KDB, widgetId);
      if (current && current.placement === "onCanvas") {
        var routed = await _context.dispatch({
          type: _context.actionTypes.ROUTE_TO_LAUNCHPAD,
          widgetId: widgetId,
          payload: { widgetId: widgetId, tabId: current.tabId, reason: "rollback", isHistoryReplay: true }
        });
        if (!routed || routed.ok !== true) {
          _unrecoverable.push(widgetId);
          continue;
        }
      }
      var placed = await _context.dispatch({
        type: _context.actionTypes.TAKE_FROM_LAUNCHPAD,
        widgetId: widgetId,
        payload: { tabId: frame.tabId, reason: "rollback", isHistoryReplay: true }
      });
      if (!placed || placed.ok !== true) { _unrecoverable.push(widgetId); } else { _restored.push(widgetId); }
    }
  }

  function restoreFrames(_context, _byId, _restored) {
    Object.keys(_byId || {}).forEach(function (widgetId) {
      _context.dispatchInternal({ type: _context.actionTypes.REGISTER_FRAME, payload: { widgetId: widgetId, frame: _byId[widgetId] } });
      _restored.push(widgetId);
    });
  }

  async function handleRestoreTabMutationSnapshot(_context, _action) {
    var restored = [];
    var unrecoverable = [];
    var payload = _action && _action.payload || {};
    try {
      var snapshot = _guard.readSnapshot(_context._KDB, payload.operationId);
      if (!snapshot) { return rollbackResult(payload.operationId, restored, unrecoverable); }
      if (snapshot.physicalStarted !== true) {
        restoreFrames(_context, snapshot.byId, restored);
        _guard.deleteSnapshot(_context._KDB, payload.operationId);
        return rollbackResult(payload.operationId, restored, unrecoverable);
      }
      if (isContentRebuildRollback(snapshot)) {
        await parkCreatedWidgets(_context, snapshot.createdWidgetIds, unrecoverable);
        await rebuildRollback(_context, snapshot, payload);
        _guard.deleteSnapshot(_context._KDB, payload.operationId);
        return rollbackResult(payload.operationId, restored, unrecoverable);
      }
      await restoreFromSnapshot(_context, snapshot, restored, unrecoverable);
      await parkCreatedWidgets(_context, snapshot.createdWidgetIds, unrecoverable);
      restoreFrames(_context, snapshot.byId, restored);
      _guard.deleteSnapshot(_context._KDB, payload.operationId);
      return rollbackResult(payload.operationId, restored, unrecoverable);
    } catch (err) {
      _guard.deleteSnapshot(_context._KDB, payload.operationId);
      return {
        ok: false,
        operationId: payload.operationId,
        restored: restored,
        unrecoverable: unrecoverable,
        diagnostics: [{ code: _codes.ROLLBACK_INCOMPLETE, message: String(err && err.message ? err.message : err) }]
      };
    }
  }

  return { handleRestoreTabMutationSnapshot: handleRestoreTabMutationSnapshot };
});

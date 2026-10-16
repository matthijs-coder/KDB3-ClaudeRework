define([
  "./ledger.js",
  "./apply.js",
  "../../config/mutationCodes.js"
], function (_ledger, _apply, _codes) {
  "use strict";

  // Rollback restores widget frames only; the widget owner's routing marks are one-way and never written here.

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

  async function parkCreatedWidgets(_port, _createdWidgetIds, _unrecoverable) {
    if (!Array.isArray(_createdWidgetIds) || _createdWidgetIds.length === 0) { return; }
    for (let index = 0; index < _createdWidgetIds.length; index += 1) {
      const widgetId = _createdWidgetIds[index];
      const current = _port.readFrame(widgetId);
      if (!current || current.placement !== "onCanvas") { continue; }
      const routed = await _port.routeToLaunchpad(widgetId, current.tabId);
      if (!routed || routed.ok !== true) { _unrecoverable.push(widgetId); }
    }
  }

  async function rebuildRollback(_KDB, _port, _snapshot, _payload) {
    const map = _snapshot.rollbackByTabId || {};
    const placeOptions = _apply.buildPlaceOptions(_KDB, _payload, "rollback");
    const parked = [];
    const keys = Object.keys(map);
    for (let index = 0; index < keys.length; index += 1) {
      const rows = Array.isArray(map[keys[index]]) ? map[keys[index]] : [];
      const result = await _apply.rebuildDestination(_KDB, _port, _snapshot.plan || {}, keys[index], rows, parked, placeOptions, _payload.runId);
      if (!result || result.ok !== true || result.structural || result.superseded) {
        throw new Error(result && result.message ? result.message : "rollback rebuild failed");
      }
    }
  }

  async function restoreFromSnapshot(_port, _snapshot, _restored, _unrecoverable) {
    const byId = _snapshot.byId || {};
    const widgetIds = Object.keys(byId);
    for (let index = 0; index < widgetIds.length; index += 1) {
      const widgetId = widgetIds[index];
      const frame = byId[widgetId];
      if (!frame || frame.placement !== "onCanvas") { continue; }
      const current = _port.readFrame(widgetId);
      if (current && current.placement === "onCanvas") {
        const routed = await _port.routeToLaunchpad(widgetId, current.tabId);
        if (!routed || routed.ok !== true) {
          _unrecoverable.push(widgetId);
          continue;
        }
      }
      const placed = await _port.takeFromLaunchpad(widgetId, frame.tabId);
      if (!placed || placed.ok !== true) { _unrecoverable.push(widgetId); } else { _restored.push(widgetId); }
    }
  }

  function restoreFrames(_port, _byId, _restored) {
    Object.keys(_byId || {}).forEach(function (widgetId) {
      _port.registerFrame(widgetId, _byId[widgetId]);
      _restored.push(widgetId);
    });
  }

  async function handleRestoreTabMutationSnapshot(_KDB, _port, _action) {
    const restored = [];
    const unrecoverable = [];
    const payload = _action && _action.payload || {};
    try {
      const snapshot = _ledger.readSnapshot(_KDB, payload.operationId);
      if (!snapshot) { return rollbackResult(payload.operationId, restored, unrecoverable); }
      if (snapshot.physicalStarted !== true) {
        restoreFrames(_port, snapshot.byId, restored);
        _ledger.deleteSnapshot(_KDB, payload.operationId);
        return rollbackResult(payload.operationId, restored, unrecoverable);
      }
      if (isContentRebuildRollback(snapshot)) {
        await parkCreatedWidgets(_port, snapshot.createdWidgetIds, unrecoverable);
        await rebuildRollback(_KDB, _port, snapshot, payload);
        _ledger.deleteSnapshot(_KDB, payload.operationId);
        return rollbackResult(payload.operationId, restored, unrecoverable);
      }
      await restoreFromSnapshot(_port, snapshot, restored, unrecoverable);
      await parkCreatedWidgets(_port, snapshot.createdWidgetIds, unrecoverable);
      restoreFrames(_port, snapshot.byId, restored);
      _ledger.deleteSnapshot(_KDB, payload.operationId);
      return rollbackResult(payload.operationId, restored, unrecoverable);
    } catch (err) {
      _ledger.deleteSnapshot(_KDB, payload.operationId);
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

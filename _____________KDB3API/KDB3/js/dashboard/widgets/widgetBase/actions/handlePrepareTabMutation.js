define([
  "./guardTabMutation.js",
  "../effects/prepareDuplicateSlotStock.js",
  "../effects/prepareDeleteSlotStock.js",
  "../effects/prepareMoveSlotStock.js"
], function (_support, _prepareDuplicateSlotStock, _prepareDeleteSlotStock, _prepareMoveSlotStock) {
  "use strict";

  async function handlePrepareTabMutation(_context, _action) {
    try {
      var payload = _action && _action.payload || {};
      var guard = _support.guardRun(_context._KDB, payload);
      if (guard) { return guard; }
      var plan = payload.plan || {};
      var snapshot = _support.snapshotFrames(_context._KDB, plan, payload.operationId);
      var runtime = _context._KDB.runtime.widgetBase;
      var snapshotWidgetIds = Object.keys(snapshot.byId || {});
      var missingRoutes = collectMissingRoutes(runtime, plan);
      if (missingRoutes.length > 0) {
        return {
          ok: false,
          operationId: payload.operationId,
          snapshotWidgetIds: snapshotWidgetIds,
          expectedDegradedEntries: 0,
          diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "Target slots are not routed yet.", missingTabIds: missingRoutes }]
        };
      }
      if (plan.operation === "duplicate" || (plan.operation === "delete" && payload.widgetRebuild === true)) {
        var prepared = await _prepareDuplicateSlotStock(_context, plan, snapshot, payload);
        if (!prepared || prepared.ok !== true) {
          return {
            ok: false,
            operationId: payload.operationId,
            snapshotWidgetIds: snapshotWidgetIds,
            expectedDegradedEntries: 0,
            diagnostics: prepared && prepared.diagnostics || []
          };
        }
      }
      var slotPrepared = null;
      if ((plan.operation === "delete" && payload.widgetRebuild !== true) || plan.operation === "restoreDeleted") {
        slotPrepared = await _prepareDeleteSlotStock(_context, plan, snapshot, payload);
        if (!slotPrepared || slotPrepared.ok !== true) {
          return {
            ok: false,
            operationId: payload.operationId,
            snapshotWidgetIds: snapshotWidgetIds,
            expectedDegradedEntries: 0,
            diagnostics: slotPrepared && slotPrepared.diagnostics || []
          };
        }
      }
      if (plan.operation === "move") {
        var movePrepared = await _prepareMoveSlotStock(_context, plan, snapshot, payload);
        if (!movePrepared || movePrepared.ok !== true) {
          return {
            ok: false,
            operationId: payload.operationId,
            snapshotWidgetIds: snapshotWidgetIds,
            expectedDegradedEntries: 0,
            diagnostics: movePrepared && movePrepared.diagnostics || []
          };
        }
      }
      var preparedResult = {
        ok: true,
        operationId: payload.operationId,
        snapshotWidgetIds: snapshotWidgetIds,
        expectedDegradedEntries: 0,
        diagnostics: []
      };
      if (plan.operation === "delete" && payload.widgetRebuild !== true) {
        preparedResult.rollbackByTabId = slotPrepared.rollbackByTabId;
      }
      if (plan.operation === "move" && isPlainObject(payload.serializedByTabId) !== true && payload.isHistoryReplay !== true) {
        preparedResult.rollbackByTabId = movePrepared.rollbackByTabId;
      }
      return preparedResult;
    } catch (err) {
      return {
        ok: false,
        operationId: _action && _action.payload && _action.payload.operationId || null,
        expectedDegradedEntries: 0,
        diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: String(err && err.message ? err.message : err) }]
      };
    }
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  }

  function collectMissingRoutes(runtime, plan) {
    var tabIds = [];
    if (plan.operation === "duplicate" || plan.operation === "restoreDeleted") {
      if (plan.insertSlot && plan.insertSlot.tabId) { tabIds.push(plan.insertSlot.tabId); }
      if (plan.revealSlot && plan.revealSlot.tabId) { tabIds.push(plan.revealSlot.tabId); }
    }
    (plan.slotMoves || []).forEach(function (move) {
      if (move.toTabId) { tabIds.push(move.toTabId); }
    });
    return tabIds.filter(function (tabId) { return runtime.routedTabIds[tabId] !== true; });
  }

  return handlePrepareTabMutation;
});

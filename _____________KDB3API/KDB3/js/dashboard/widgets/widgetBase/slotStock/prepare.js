define([
  "./guard.js",
  "./serialize.js",
  "../../../tabs/config/mutationCodes.js",
  "../../../../core/utils/kit/data.js"
], function (_guard, _serialize, _codes, _data) {
  "use strict";

  // Each builder returns the stock plan for one prepare variant, or a fail result.
  // The variant flags are intentional and covered by smoke checks; do not unify their ordering:
  // - early: rebuild/rollback (and serializedByTabId) are written to the snapshot BEFORE the unsupported and
  //   shortage checks, so a failed duplicate keeps them; otherwise the snapshot is written only after both checks.
  // - returnRollback: the prepare result carries rollbackByTabId (delete forward, move forward outside replay).
  var VARIANTS = {
    duplicate: function (_context, _plan) {
      var affected = _plan.affectedTabIds || [];
      var live = _serialize.liveMap(_context, _plan, affected);
      var rebuild = forwardRebuild(_plan, live);
      if (_plan.insertSlot && _plan.insertSlot.tabId) {
        rebuild[_plan.insertSlot.tabId] = live[_plan.sourceSlot && _plan.sourceSlot.tabId] || [];
      }
      return { early: true, rebuild: rebuild, rollback: pickRows(live, Object.keys(rebuild)), serialized: live, kindTabIds: affected };
    },
    widgetRebuild: function (_context, _plan, _payload) {
      var source = _payload.serializedByTabId;
      var rebuild = source !== null && typeof source === "object" ? _data.cloneJson(source) : {};
      var keys = Object.keys(rebuild);
      return { early: true, markWidgetRebuild: true, rebuild: rebuild, rollback: _serialize.liveMap(_context, _plan, keys), kindTabIds: keys };
    },
    delete: function (_context, _plan) {
      var participating = participatingTabIds(_plan, [_plan.deletedSlot, _plan.hideSlot]);
      var live = _serialize.liveMap(_context, _plan, participating);
      var rebuild = forwardRebuild(_plan, live);
      var hideTabId = _plan.hideSlot && _plan.hideSlot.tabId;
      if (hideTabId && Object.prototype.hasOwnProperty.call(rebuild, hideTabId)) {
        return _serialize.fail(_codes.PREPARE_FAILED, "Hide slot is not a delete rebuild destination.", hideTabId);
      }
      return { rebuild: rebuild, rollback: live, kindTabIds: participating, returnRollback: true };
    },
    restoreDeleted: function (_context, _plan, _payload) {
      if (!_data.isPlainObject(_payload.serializedByTabId)) {
        return _serialize.fail(_codes.PREPARE_FAILED, "restoreDeleted requires a plain serializedByTabId object.");
      }
      return fromSerialized(_context, _plan, _payload.serializedByTabId, false);
    },
    move: function (_context, _plan, _payload) {
      var serialized = _payload.serializedByTabId;
      if (serialized != null && _data.isPlainObject(serialized) !== true) {
        return _serialize.fail(_codes.PREPARE_FAILED, "move undo requires a plain serializedByTabId object.");
      }
      if (_data.isPlainObject(serialized)) {
        return fromSerialized(_context, _plan, serialized, true);
      }
      var participating = participatingTabIds(_plan, []);
      var live = _serialize.liveMap(_context, _plan, participating, true);
      return { rebuild: forwardRebuild(_plan, live), rollback: live, kindTabIds: participating, returnRollback: _payload.isHistoryReplay !== true };
    }
  };

  function forwardRebuild(_plan, _live) {
    var rebuild = {};
    (_plan.slotMoves || []).forEach(function (move) {
      rebuild[move.toTabId] = _live[move.fromTabId] || [];
    });
    return rebuild;
  }

  function pickRows(_live, _tabIds) {
    var rows = {};
    _tabIds.forEach(function (tabId) { rows[tabId] = _live[tabId] || []; });
    return rows;
  }

  function fromSerialized(_context, _plan, _serialized, _requireFiniteTabIdx) {
    var rebuild = _data.cloneJson(_serialized);
    var keys = Object.keys(rebuild);
    return { rebuild: rebuild, rollback: _serialize.liveMap(_context, _plan, keys, _requireFiniteTabIdx), kindTabIds: keys };
  }

  function participatingTabIds(_plan, _slots) {
    var seen = {};
    var ids = [];
    function collect(tabId) {
      if (tabId && seen[tabId] !== true) {
        seen[tabId] = true;
        ids.push(tabId);
      }
    }
    _slots.forEach(function (slot) { collect(slot && slot.tabId); });
    (_plan.slotMoves || []).forEach(function (move) {
      collect(move.fromTabId);
      collect(move.toTabId);
    });
    return ids;
  }

  function resolveVariant(_plan, _payload) {
    var operation = _plan.operation;
    if ((operation === "duplicate" || operation === "delete") && _payload.widgetRebuild === true) { return "widgetRebuild"; }
    if (operation === "duplicate" || operation === "delete" || operation === "restoreDeleted" || operation === "move") { return operation; }
    return null;
  }

  async function prepareSlotStock(_context, _plan, _snapshot, _payload, _variant) {
    var stock = VARIANTS[_variant](_context, _plan, _payload);
    if (stock.ok === false) { return stock; }
    if (stock.early) {
      if (stock.markWidgetRebuild) { _snapshot.widgetRebuild = true; }
      _snapshot.rebuildByTabId = stock.rebuild;
      _snapshot.rollbackByTabId = stock.rollback;
      if (stock.serialized) { _snapshot.serializedByTabId = stock.serialized; }
    }
    var unsupported = _serialize.findUnsupported(_context, stock.kindTabIds);
    if (unsupported) { return unsupported; }
    var shortage = await _serialize.findStockShortage(_context, stock.rebuild);
    if (shortage) { return shortage; }
    if (stock.early) {
      delete _snapshot.serializedByTabId;
      return { ok: true, diagnostics: [] };
    }
    _snapshot.rebuildByTabId = stock.rebuild;
    _snapshot.rollbackByTabId = stock.rollback;
    _snapshot.slotStockRebuild = true;
    var result = { ok: true, diagnostics: [] };
    if (stock.returnRollback === true) { result.rollbackByTabId = stock.rollback; }
    return result;
  }

  function collectMissingRoutes(_runtime, _plan) {
    var tabIds = [];
    if (_plan.operation === "duplicate" || _plan.operation === "restoreDeleted") {
      if (_plan.insertSlot && _plan.insertSlot.tabId) { tabIds.push(_plan.insertSlot.tabId); }
      if (_plan.revealSlot && _plan.revealSlot.tabId) { tabIds.push(_plan.revealSlot.tabId); }
    }
    (_plan.slotMoves || []).forEach(function (move) {
      if (move.toTabId) { tabIds.push(move.toTabId); }
    });
    return tabIds.filter(function (tabId) { return _runtime.routedTabIds[tabId] !== true; });
  }

  function prepareResult(_ok, _operationId, _snapshotWidgetIds, _diagnostics) {
    return { ok: _ok, operationId: _operationId, snapshotWidgetIds: _snapshotWidgetIds, expectedDegradedEntries: 0, diagnostics: _diagnostics };
  }

  async function handlePrepareTabMutation(_context, _action) {
    try {
      var payload = _action && _action.payload || {};
      var guard = _guard.guardRun(_context._KDB, payload);
      if (guard) { return guard; }
      var plan = payload.plan || {};
      var snapshot = _guard.snapshotFrames(_context._KDB, plan, payload.operationId);
      var snapshotWidgetIds = Object.keys(snapshot.byId || {});
      var missingRoutes = collectMissingRoutes(_context._KDB.runtime.widgetBase, plan);
      if (missingRoutes.length > 0) {
        return prepareResult(false, payload.operationId, snapshotWidgetIds, [
          { code: "TABS_MUTATION_PREPARE_FAILED", message: "Target slots are not routed yet.", missingTabIds: missingRoutes }
        ]);
      }
      var variant = resolveVariant(plan, payload);
      var prepared = variant ? await prepareSlotStock(_context, plan, snapshot, payload, variant) : { ok: true };
      if (!prepared || prepared.ok !== true) {
        return prepareResult(false, payload.operationId, snapshotWidgetIds, prepared && prepared.diagnostics || []);
      }
      var result = prepareResult(true, payload.operationId, snapshotWidgetIds, []);
      if (prepared.rollbackByTabId) { result.rollbackByTabId = prepared.rollbackByTabId; }
      return result;
    } catch (err) {
      return {
        ok: false,
        operationId: _action && _action.payload && _action.payload.operationId || null,
        expectedDegradedEntries: 0,
        diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: String(err && err.message ? err.message : err) }]
      };
    }
  }

  return { handlePrepareTabMutation: handlePrepareTabMutation, prepareSlotStock: prepareSlotStock };
});

define([
  "./ledger.js",
  "../../config/mutationCodes.js",
  "../../../../core/utils/kit/data.js"
], function (_ledger, _codes, _data) {
  "use strict";

  // Slot-stock prepare: decides, per mutation variant, which serialized widget rows go to which slot and checks
  // that every destination has enough widget shells. All widget reads go through the injected port.
  // Each builder returns the stock plan for one prepare variant, or a fail result.
  // The variant flags are intentional and covered by smoke checks; do not unify their ordering:
  // - early: rebuild/rollback (and serializedByTabId) are written to the snapshot BEFORE the unsupported and
  //   shortage checks, so a failed duplicate keeps them; otherwise the snapshot is written only after both checks.
  // - returnRollback: the prepare result carries rollbackByTabId (delete forward, move forward outside replay).
  const VARIANTS = {
    duplicate: function (_port, _plan) {
      const affected = _plan.affectedTabIds || [];
      const live = _port.liveMap(_plan, affected);
      const rebuild = forwardRebuild(_plan, live);
      if (_plan.insertSlot && _plan.insertSlot.tabId) {
        rebuild[_plan.insertSlot.tabId] = live[_plan.sourceSlot && _plan.sourceSlot.tabId] || [];
      }
      return { early: true, rebuild: rebuild, rollback: pickRows(live, Object.keys(rebuild)), serialized: live, kindTabIds: affected };
    },
    widgetRebuild: function (_port, _plan, _payload) {
      const source = _payload.serializedByTabId;
      const rebuild = source !== null && typeof source === "object" ? _data.cloneJson(source) : {};
      const keys = Object.keys(rebuild);
      return { early: true, markWidgetRebuild: true, rebuild: rebuild, rollback: _port.liveMap(_plan, keys), kindTabIds: keys };
    },
    delete: function (_port, _plan) {
      const participating = participatingTabIds(_plan, [_plan.deletedSlot, _plan.hideSlot]);
      const live = _port.liveMap(_plan, participating);
      const rebuild = forwardRebuild(_plan, live);
      const hideTabId = _plan.hideSlot && _plan.hideSlot.tabId;
      if (hideTabId && Object.prototype.hasOwnProperty.call(rebuild, hideTabId)) {
        return _port.fail(_codes.PREPARE_FAILED, "Hide slot is not a delete rebuild destination.", hideTabId);
      }
      return { rebuild: rebuild, rollback: live, kindTabIds: participating, returnRollback: true };
    },
    restoreDeleted: function (_port, _plan, _payload) {
      if (!_data.isPlainObject(_payload.serializedByTabId)) {
        return _port.fail(_codes.PREPARE_FAILED, "restoreDeleted requires a plain serializedByTabId object.");
      }
      return fromSerialized(_port, _plan, _payload.serializedByTabId, false);
    },
    move: function (_port, _plan, _payload) {
      const serialized = _payload.serializedByTabId;
      if (serialized != null && _data.isPlainObject(serialized) !== true) {
        return _port.fail(_codes.PREPARE_FAILED, "move undo requires a plain serializedByTabId object.");
      }
      if (_data.isPlainObject(serialized)) {
        return fromSerialized(_port, _plan, serialized, true);
      }
      const participating = participatingTabIds(_plan, []);
      const live = _port.liveMap(_plan, participating, true);
      return { rebuild: forwardRebuild(_plan, live), rollback: live, kindTabIds: participating, returnRollback: _payload.isHistoryReplay !== true };
    }
  };

  function forwardRebuild(_plan, _live) {
    const rebuild = {};
    (_plan.slotMoves || []).forEach(function (move) {
      rebuild[move.toTabId] = _live[move.fromTabId] || [];
    });
    return rebuild;
  }

  function pickRows(_live, _tabIds) {
    const rows = {};
    _tabIds.forEach(function (tabId) { rows[tabId] = _live[tabId] || []; });
    return rows;
  }

  function fromSerialized(_port, _plan, _serialized, _requireFiniteTabIdx) {
    const rebuild = _data.cloneJson(_serialized);
    const keys = Object.keys(rebuild);
    return { rebuild: rebuild, rollback: _port.liveMap(_plan, keys, _requireFiniteTabIdx), kindTabIds: keys };
  }

  function participatingTabIds(_plan, _slots) {
    const seen = {};
    const ids = [];
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
    const operation = _plan.operation;
    if ((operation === "duplicate" || operation === "delete") && _payload.widgetRebuild === true) { return "widgetRebuild"; }
    if (operation === "duplicate" || operation === "delete" || operation === "restoreDeleted" || operation === "move") { return operation; }
    return null;
  }

  async function prepareSlotStock(_port, _plan, _snapshot, _payload, _variant) {
    const stock = VARIANTS[_variant](_port, _plan, _payload);
    if (stock.ok === false) { return stock; }
    if (stock.early) {
      if (stock.markWidgetRebuild) { _snapshot.widgetRebuild = true; }
      _snapshot.rebuildByTabId = stock.rebuild;
      _snapshot.rollbackByTabId = stock.rollback;
      if (stock.serialized) { _snapshot.serializedByTabId = stock.serialized; }
    }
    const unsupported = _port.findUnsupported(stock.kindTabIds);
    if (unsupported) { return unsupported; }
    const shortage = await _port.findStockShortage(stock.rebuild);
    if (shortage) { return shortage; }
    if (stock.early) {
      delete _snapshot.serializedByTabId;
      return { ok: true, diagnostics: [] };
    }
    _snapshot.rebuildByTabId = stock.rebuild;
    _snapshot.rollbackByTabId = stock.rollback;
    _snapshot.slotStockRebuild = true;
    const result = { ok: true, diagnostics: [] };
    if (stock.returnRollback === true) { result.rollbackByTabId = stock.rollback; }
    return result;
  }

  function collectMissingRoutes(_port, _plan) {
    const tabIds = [];
    if (_plan.operation === "duplicate" || _plan.operation === "restoreDeleted") {
      if (_plan.insertSlot && _plan.insertSlot.tabId) { tabIds.push(_plan.insertSlot.tabId); }
      if (_plan.revealSlot && _plan.revealSlot.tabId) { tabIds.push(_plan.revealSlot.tabId); }
    }
    (_plan.slotMoves || []).forEach(function (move) {
      if (move.toTabId) { tabIds.push(move.toTabId); }
    });
    return tabIds.filter(function (tabId) { return _port.isRouted(tabId) !== true; });
  }

  function prepareResult(_ok, _operationId, _snapshotWidgetIds, _diagnostics) {
    return { ok: _ok, operationId: _operationId, snapshotWidgetIds: _snapshotWidgetIds, expectedDegradedEntries: 0, diagnostics: _diagnostics };
  }

  // The ledger snapshot starts as a copy of the affected widget frames; the plan is cloned so later plan changes
  // cannot alter the rollback data.
  function startSnapshot(_KDB, _port, _plan, _operationId) {
    const affected = _port.readAffectedFrames(_plan);
    return _ledger.writeSnapshot(_KDB, _operationId, {
      operationId: _operationId,
      plan: _data.cloneJson(_plan || null),
      physicalStarted: false,
      byId: affected
    });
  }

  async function handlePrepareTabMutation(_KDB, _port, _action) {
    try {
      const payload = _action && _action.payload || {};
      const guard = _ledger.guardRun(_KDB, payload, _port.ownerLabel);
      if (guard) { return guard; }
      const plan = payload.plan || {};
      const snapshot = startSnapshot(_KDB, _port, plan, payload.operationId);
      const snapshotWidgetIds = Object.keys(snapshot.byId || {});
      const missingRoutes = collectMissingRoutes(_port, plan);
      if (missingRoutes.length > 0) {
        return prepareResult(false, payload.operationId, snapshotWidgetIds, [
          { code: "TABS_MUTATION_PREPARE_FAILED", message: "Target slots are not routed yet.", missingTabIds: missingRoutes }
        ]);
      }
      const variant = resolveVariant(plan, payload);
      const prepared = variant ? await prepareSlotStock(_port, plan, snapshot, payload, variant) : { ok: true };
      if (!prepared || prepared.ok !== true) {
        return prepareResult(false, payload.operationId, snapshotWidgetIds, prepared && prepared.diagnostics || []);
      }
      const result = prepareResult(true, payload.operationId, snapshotWidgetIds, []);
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

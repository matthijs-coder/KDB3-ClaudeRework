define([
  "./ledger.js"
], function (_ledger) {
  "use strict";

  const APPLY_FAILED = "TABS_MUTATION_APPLY_FAILED";
  const DUPLICATE_MESSAGES = {
    failed: "widgetBase tab mutation superseded during duplicate apply",
    superseded: "widgetBase tab mutation superseded during duplicate apply"
  };
  const REBUILD_MESSAGES = {
    failed: "widget rebuild failed.",
    superseded: "widgetBase tab mutation superseded during widget rebuild."
  };
  // delete covers both the user delete and the widgetRebuild delete (undo of a duplicate): the hidden slot is
  // parked first and skipped by the rebuild loop. Only duplicate skips empty rows that are not a slotMove source.
  const VARIANTS = {
    duplicate: { reason: "tabDuplicate", skipEmpty: true, messages: DUPLICATE_MESSAGES },
    delete: { reason: "tabDelete", parkHideSlot: true, messages: REBUILD_MESSAGES },
    restoreDeleted: { reason: "tabRestore", messages: REBUILD_MESSAGES },
    move: { reason: "tabMove", messages: REBUILD_MESSAGES }
  };

  function failApply(_parked, _moved, _message) {
    return { ok: false, moved: _moved, parked: _parked, diagnostics: [{ code: APPLY_FAILED, message: _message }] };
  }

  // guard.isCurrent and deps.isStale let the widget placement stop a superseded run without reading tabs state.
  function buildPlaceOptions(_KDB, _payload, _reason) {
    return {
      guard: {
        kind: "tabMutationRunId",
        runId: _payload.runId,
        isCurrent: function () { return _ledger.isCurrent(_KDB, _payload.runId); }
      },
      reason: _reason,
      source: "tabsMutation",
      skipHistory: true,
      isHistoryReplay: true,
      restorePayload: { source: "tabsMutation", skipHistory: true, runId: _payload.runId }
    };
  }

  function rebuildDestination(_KDB, _port, _plan, _tabId, _rows, _parked, _placeOptions, _runId) {
    return _port.rebuildSlot(_tabId, _rows, {
      plan: _plan,
      parked: _parked,
      placeOptions: _placeOptions,
      runId: _runId,
      isStale: function () { return _ledger.isStale(_KDB, _runId); }
    });
  }

  function recordCreated(_snapshot, _created) {
    if (!_snapshot.createdWidgetIds) { _snapshot.createdWidgetIds = []; }
    (_created || []).forEach(function (entry) {
      if (entry && entry.widgetId) { _snapshot.createdWidgetIds.push(entry.widgetId); }
    });
  }

  function isSlotMoveFrom(_plan, _tabId) {
    return (_plan.slotMoves || []).some(function (move) { return move.fromTabId === _tabId; });
  }

  // Rebuilds every snapshot.rebuildByTabId destination in key order and fills the created widgets' content.
  // Returns a fail result on the first structural, superseded or stale slot; null when all slots are rebuilt.
  async function rebuildTabs(_KDB, _port, _payload, _plan, _snapshot, _state, _options) {
    const rebuildMap = _snapshot.rebuildByTabId || {};
    const keys = Object.keys(rebuildMap);
    for (let index = 0; index < keys.length; index += 1) {
      const tabId = keys[index];
      const rows = Array.isArray(rebuildMap[tabId]) ? rebuildMap[tabId] : [];
      if (tabId === _options.skipTabId || (_options.skipEmpty && rows.length === 0 && !isSlotMoveFrom(_plan, tabId))) {
        continue;
      }
      const slotResult = await rebuildDestination(_KDB, _port, _plan, tabId, rows, _state.parked, _options.placeOptions, _payload.runId);
      recordCreated(_snapshot, slotResult && slotResult.created);
      if (!slotResult || slotResult.ok !== true || slotResult.structural || slotResult.superseded) {
        return failApply(_state.parked, _state.moved, slotResult && slotResult.message ? slotResult.message : _options.messages.failed);
      }
      _state.created = _state.created.concat(slotResult.created || []);
      _state.degradedEntries = _state.degradedEntries.concat(slotResult.degradedEntries || []);
      if (slotResult.created && slotResult.created.length > 0) {
        if (_ledger.isStale(_KDB, _payload.runId)) {
          return failApply(_state.parked, _state.moved, _options.messages.superseded);
        }
        const fillResult = await _port.fillContent(slotResult.created, rows);
        _state.degradedEntries = _state.degradedEntries.concat(fillResult && fillResult.degraded || []);
      }
    }
    return null;
  }

  async function applySlotStock(_KDB, _port, _payload, _plan, _snapshot, _parked, _moved, _variant) {
    const variant = VARIANTS[_variant];
    if (_variant === "duplicate") {
      if (!_plan.insertSlot || !_plan.insertSlot.tabId) {
        return failApply(_parked, _moved, "duplicate plan missing insertSlot.tabId");
      }
      if (!_snapshot.rebuildByTabId || typeof _snapshot.rebuildByTabId !== "object") {
        return failApply(_parked, _moved, "duplicate prepare snapshot missing rebuildByTabId");
      }
    }
    const placeOptions = buildPlaceOptions(_KDB, _payload, variant.reason);
    const hideTabId = variant.parkHideSlot ? _plan.hideSlot && _plan.hideSlot.tabId : null;
    if (hideTabId) {
      const hideResult = await rebuildDestination(_KDB, _port, _plan, hideTabId, [], _parked, placeOptions, _payload.runId);
      if (!hideResult || hideResult.ok !== true) {
        return failApply(_parked, _moved, hideResult && hideResult.message ? hideResult.message : "widget rebuild failed to park the hidden slot.");
      }
    }
    const state = { parked: _parked, moved: _moved, created: [], degradedEntries: [] };
    const failed = await rebuildTabs(_KDB, _port, _payload, _plan, _snapshot, state, {
      placeOptions: placeOptions,
      skipTabId: hideTabId,
      skipEmpty: variant.skipEmpty === true,
      messages: variant.messages
    });
    if (failed) { return failed; }
    return {
      ok: true, operationId: _payload.operationId, moved: _moved, parked: _parked,
      created: state.created, degradedEntries: state.degradedEntries, diagnostics: []
    };
  }

  async function handleApplyTabMutation(_KDB, _port, _action) {
    const moved = [];
    const parked = [];
    try {
      const payload = _action && _action.payload || {};
      const guard = _ledger.guardRun(_KDB, payload, _port.ownerLabel);
      if (guard) { return guard; }
      const plan = payload.plan || {};
      if (!Object.prototype.hasOwnProperty.call(VARIANTS, plan.operation)) {
        return failApply(parked, moved, "widgetBase tab mutation apply supports delete, move, duplicate, and restoreDeleted.");
      }
      const snapshot = _ledger.readSnapshot(_KDB, payload.operationId);
      if (snapshot) { snapshot.physicalStarted = true; }
      return await applySlotStock(_KDB, _port, payload, plan, snapshot || {}, parked, moved, plan.operation);
    } catch (err) {
      return failApply(parked, moved, String(err && err.message ? err.message : err));
    }
  }

  return {
    handleApplyTabMutation: handleApplyTabMutation,
    rebuildDestination: rebuildDestination,
    buildPlaceOptions: buildPlaceOptions
  };
});

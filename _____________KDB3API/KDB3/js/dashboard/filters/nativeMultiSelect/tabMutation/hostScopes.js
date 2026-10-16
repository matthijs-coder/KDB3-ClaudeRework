define([
  "../config.js",
  "../state.js",
  "../inventory.js",
  "../hostFilterIo.js",
  "./guard.js"
], function (_config, _state, _inventory, _hostFilterIo, _guard) {
  "use strict";

  var actions = _config.actions;
  var codes = _config.tabMutationCodes;

  function dispatchScopeWrite(_ctx, _scopeId, _items, _clear) {
    _ctx.dispatchInternal({
      type: actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { scopeId: _scopeId, items: _items, clear: _clear === true }
    });
  }

  function failed(_operationId, _appliedScopes, _clearedScopes, _diagnostics) {
    return {
      ok: false,
      operationId: _operationId || null,
      appliedScopes: _appliedScopes || [],
      clearedScopes: _clearedScopes || [],
      diagnostics: _diagnostics || []
    };
  }

  // Empties one host item. A dest item that cannot be found is skipped with a warning.
  async function clearHostItem(_KDB, _itemId, _scopeId, _diagnostics, _filtersFacet) {
    var filterRef;
    var written;
    if (!_filtersFacet) {
      _diagnostics.push({ code: codes.APPLY_FAILED, itemId: _itemId, scopeId: _scopeId, message: "host apply API unavailable" });
      return;
    }
    filterRef = _inventory.lookupRef(_KDB, _itemId, _scopeId, _filtersFacet);
    if (!filterRef) {
      _hostFilterIo.warnDestSkip("applyHostItem", { itemId: _itemId, scopeId: _scopeId });
      return;
    }
    written = await _hostFilterIo.writeRef(_filtersFacet, filterRef, []);
    if (!written.ok) {
      _diagnostics.push({ code: codes.APPLY_FAILED, itemId: _itemId, scopeId: _scopeId, message: written.message });
    }
  }

  async function writeScopeFromSnapshot(_ctx, _scopeId, _items, _payload, _appliedScopes, _diagnostics) {
    var destItems = [];
    var sourceItems = _items || [];
    var idx;
    for (idx = 0; idx < sourceItems.length; idx += 1) {
      var source = _state.cloneItem(sourceItems[idx]);
      var destRef = _inventory.lookupRefByName(_ctx._KDB, source.itemName, _scopeId, _ctx.filtersFacet);
      if (!destRef) {
        _hostFilterIo.warnDestSkip("applyHostItem", { itemId: source.itemId, itemName: source.itemName, scopeId: _scopeId });
        continue;
      }
      var destItemId = String(destRef.itemId || "");
      var written = await _hostFilterIo.writeRef(_ctx.filtersFacet, destRef, source.values);
      if (!written.ok) {
        _diagnostics.push({ code: codes.APPLY_FAILED, itemId: destItemId, scopeId: _scopeId, message: written.message });
        if (_guard.isStale(_ctx.runtime, _payload)) { return; }
        continue;
      }
      if (_guard.isStale(_ctx.runtime, _payload)) { return; }
      destItems.push({
        itemId: destItemId,
        itemName: String(destRef.itemName || source.itemName || ""),
        sourceId: String(destRef.sourceId || source.sourceId || ""),
        values: source.values
      });
    }
    dispatchScopeWrite(_ctx, _scopeId, destItems, false);
    _guard.pushUnique(_appliedScopes, _scopeId);
  }

  async function clearScopeItems(_ctx, _scopeId, _items, _payload, _clearedScopes, _diagnostics) {
    dispatchScopeWrite(_ctx, _scopeId, [], true);
    var snapshotItems = _items || [];
    var idx;
    for (idx = 0; idx < snapshotItems.length; idx += 1) {
      await clearHostItem(_ctx._KDB, snapshotItems[idx].itemId, _scopeId, _diagnostics, _ctx.filtersFacet);
      if (_guard.isStale(_ctx.runtime, _payload)) { return; }
    }
    _guard.pushUnique(_clearedScopes, _scopeId);
  }

  // Pushes the owner's stored items of one scope back into the host.
  async function resyncHostScope(_KDB, _scopeId, _items, _diagnostics, _filtersFacet) {
    if (!_filtersFacet) {
      _diagnostics.push({ code: codes.APPLY_FAILED, scopeId: _scopeId, message: "host apply API unavailable" });
      return;
    }
    var ownerItems = _items || [];
    var idx;
    for (idx = 0; idx < ownerItems.length; idx += 1) {
      var item = ownerItems[idx];
      var filterRef = _inventory.lookupRef(_KDB, item.itemId, _scopeId, _filtersFacet) ||
        _inventory.lookupRefByName(_KDB, item.itemName, _scopeId, _filtersFacet);
      if (!filterRef) {
        _hostFilterIo.warnDestSkip("applyHostItem", { itemId: item.itemId, itemName: item.itemName, scopeId: _scopeId });
        continue;
      }
      var itemId = String(filterRef.itemId || item.itemId || "");
      var written = await _hostFilterIo.writeRef(_filtersFacet, filterRef, item.values);
      if (!written.ok) {
        _diagnostics.push({ code: codes.APPLY_FAILED, itemId: itemId, scopeId: _scopeId, message: written.message });
      }
    }
  }

  // Affected slots of a plan, one per tabIdx. core listAffectedPlanSlots does not dedupe (WS-O, Phase 2).
  function collectAffectedSlots(_plan) {
    var plan = _plan || {};
    var slots = [];
    var seen = {};
    function pushSlot(_slot) {
      var slot = _slot || {};
      if (typeof slot.tabIdx !== "number" || seen[slot.tabIdx]) { return; }
      seen[slot.tabIdx] = true;
      slots.push({ tabIdx: slot.tabIdx, tabId: slot.tabId || null });
    }
    (plan.slotMoves || []).forEach(function (_move) {
      pushSlot({ tabIdx: _move.fromTabIdx, tabId: _move.fromTabId });
      pushSlot({ tabIdx: _move.toTabIdx, tabId: _move.toTabId });
    });
    if (plan.deletedSlot) { pushSlot(plan.deletedSlot); }
    if (plan.hideSlot) { pushSlot(plan.hideSlot); }
    if (plan.operation === "duplicate") {
      if (plan.clonePair) {
        pushSlot(plan.clonePair.from);
        pushSlot(plan.clonePair.to);
      }
      if (plan.sourceSlot) { pushSlot(plan.sourceSlot); }
      if (plan.insertSlot) { pushSlot(plan.insertSlot); }
      if (plan.revealSlot) { pushSlot(plan.revealSlot); }
    }
    if (plan.operation === "restoreDeleted") {
      if (plan.insertSlot) { pushSlot(plan.insertSlot); }
      if (plan.revealSlot) { pushSlot(plan.revealSlot); }
    }
    return slots;
  }

  async function resyncTabMutationHost(_ctx, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    try {
      var guard = _guard.guardRun(_ctx.runtime, payload);
      if (guard) { return { ok: false, diagnostics: guard.diagnostics || [] }; }
      var tabTargets = payload.tabIdxToScopeId || {};
      var byScope = _state.readByScope(_ctx._KDB);
      var affectedSlots = collectAffectedSlots(payload.plan);
      var s;
      for (s = 0; s < affectedSlots.length; s += 1) {
        var resolved = _guard.resolveScopeIdForSlot(_ctx._KDB, tabTargets, affectedSlots[s]);
        if (!resolved.ok) {
          diagnostics = diagnostics.concat(resolved.diagnostics || []);
          continue;
        }
        if (resolved.skip) { continue; }
        await resyncHostScope(_ctx._KDB, resolved.scopeId, byScope[resolved.scopeId] || [], diagnostics, _ctx.filtersFacet);
      }
      return { ok: true, operationId: payload.operationId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[nativeMultiSelect.resyncTabMutationHost] failed", { operationId: payload.operationId }, error);
      diagnostics.push({ code: codes.APPLY_FAILED, message: String(error && error.message ? error.message : error) });
      return { ok: false, operationId: payload.operationId, diagnostics: diagnostics };
    }
  }

  return {
    failed: failed,
    clearScopeItems: clearScopeItems,
    writeScopeFromSnapshot: writeScopeFromSnapshot,
    resyncTabMutationHost: resyncTabMutationHost
  };
});

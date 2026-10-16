define([
  "../config.js",
  "../state.js",
  "../inventory.js",
  "../hostFilterIo.js",
  "./guard.js",
  "../../_core/tabMutation.js",
  "../../_core/tabMutationScopes.js",
  "../../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js"
], function (_config, _state, _inventory, _hostFilterIo, _guard, _tabMutation, _scopes, _listAffectedPlanSlots) {
  "use strict";

  var actions = _config.actions;
  var codes = _config.tabMutationCodes;

  function dispatchScopeWrite(_ctx, _scopeId, _items, _clear) {
    _ctx.dispatchInternal({
      type: actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { scopeId: _scopeId, items: _items, clear: _clear === true }
    });
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
    _scopes.pushUnique(_appliedScopes, _scopeId);
  }

  async function clearScopeItems(_ctx, _scopeId, _items, _payload, _clearedScopes, _diagnostics) {
    dispatchScopeWrite(_ctx, _scopeId, [], true);
    var snapshotItems = _items || [];
    var idx;
    for (idx = 0; idx < snapshotItems.length; idx += 1) {
      await clearHostItem(_ctx._KDB, snapshotItems[idx].itemId, _scopeId, _diagnostics, _ctx.filtersFacet);
      if (_guard.isStale(_ctx.runtime, _payload)) { return; }
    }
    _scopes.pushUnique(_clearedScopes, _scopeId);
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

  async function run(_ctx, _payload, _diagnostics) {
    var tabTargets = _payload.tabIdxToScopeId || {};
    var byScope = _state.readByScope(_ctx._KDB);
    var affectedSlots = _listAffectedPlanSlots(_payload.plan, { dedupeByTabIdx: true, includeClonePair: true });
    var s;
    for (s = 0; s < affectedSlots.length; s += 1) {
      var resolved = _guard.resolveScopeIdForSlot(_ctx._KDB, tabTargets, affectedSlots[s]);
      if (!resolved.ok) {
        _diagnostics.push.apply(_diagnostics, resolved.diagnostics || []);
        continue;
      }
      if (resolved.skip) { continue; }
      await resyncHostScope(_ctx._KDB, resolved.scopeId, byScope[resolved.scopeId] || [], _diagnostics, _ctx.filtersFacet);
    }
  }

  var resyncTabMutationHost = _tabMutation.createResync(_guard.tabMutationBase, { run: run });

  return {
    clearScopeItems: clearScopeItems,
    writeScopeFromSnapshot: writeScopeFromSnapshot,
    resyncTabMutationHost: resyncTabMutationHost
  };
});

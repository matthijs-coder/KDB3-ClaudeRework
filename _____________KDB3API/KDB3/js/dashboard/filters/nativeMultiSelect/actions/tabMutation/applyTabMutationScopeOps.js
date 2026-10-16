define([
  "../../config/actions.js",
  "../../effects/lookupNativeMultiSelectRef.js",
  "../../effects/lookupNativeMultiSelectRefByName.js"
], function (_actions, _lookupNativeMultiSelectRef, _lookupNativeMultiSelectRefByName) {
  "use strict";

  function dispatchScopeWrite(_ctx, _scopeId, _items, _clear) {
    _ctx.dispatchInternal({
      type: _actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { scopeId: _scopeId, items: _items, clear: _clear === true }
    });
  }

  function warnDestSkip(_details) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[nativeMultiSelect.applyHostItem] dest item skipped", _details);
    }
  }

  function describeFailure(_outcome) {
    if (!_outcome) { return "host write not applied"; }
    if (_outcome.diagnostics && _outcome.diagnostics[0] && _outcome.diagnostics[0].message) {
      return _outcome.diagnostics[0].message;
    }
    return String(_outcome.errorCode || _outcome.reason || _outcome.outcome);
  }

  async function applyHostItem(_KDB, _itemId, _scopeId, _values, _diagnostics, _filtersFacet) {
    var filterRef;
    var outcome;
    if (!_filtersFacet) {
      _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", itemId: _itemId, scopeId: _scopeId, message: "host apply API unavailable" });
      return;
    }
    filterRef = _lookupNativeMultiSelectRef(_KDB, _itemId, _scopeId, _filtersFacet);
    if (!filterRef) {
      warnDestSkip({ itemId: _itemId, scopeId: _scopeId });
      return;
    }
    outcome = await _filtersFacet.writeFilter({ ref: filterRef, values: _values || [] });
    if (!outcome || outcome.ok !== true) {
      _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", itemId: _itemId, scopeId: _scopeId, message: describeFailure(outcome) });
    }
  }

  async function writeScopeFromSnapshot(_ctx, _scopeId, _items, _payload, _appliedScopes, _diagnostics, _support) {
    var destItems = [];
    var filtersFacet = _ctx.filtersFacet;
    var sourceItems = _items || [];
    var idx;
    for (idx = 0; idx < sourceItems.length; idx += 1) {
      var source = _support.cloneItem(sourceItems[idx]);
      var destRef = _lookupNativeMultiSelectRefByName(_ctx._KDB, source.itemName, _scopeId, filtersFacet);
      if (!destRef) {
        warnDestSkip({ itemId: source.itemId, itemName: source.itemName, scopeId: _scopeId });
        continue;
      }
      if (!filtersFacet) {
        _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", itemId: source.itemId, scopeId: _scopeId, message: "host apply API unavailable" });
        continue;
      }
      var destItemId = String(destRef.itemId || "");
      var writeOutcome = await filtersFacet.writeFilter({ ref: destRef, values: source.values || [] });
      if (!writeOutcome || writeOutcome.ok !== true) {
        _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", itemId: destItemId, scopeId: _scopeId, message: describeFailure(writeOutcome) });
        if (_support.isStale(_ctx.runtime, _payload)) { return; }
        continue;
      }
      if (_support.isStale(_ctx.runtime, _payload)) { return; }
      destItems.push({
        itemId: destItemId,
        itemName: String(destRef.itemName || source.itemName || ""),
        sourceId: String(destRef.sourceId || source.sourceId || ""),
        values: source.values
      });
    }
    dispatchScopeWrite(_ctx, _scopeId, destItems, false);
    _support.pushUnique(_appliedScopes, _scopeId);
  }

  async function clearScopeItems(_ctx, _scopeId, _items, _payload, _clearedScopes, _diagnostics, _support) {
    dispatchScopeWrite(_ctx, _scopeId, [], true);
    var snapshotItems = _items || [];
    var idx;
    for (idx = 0; idx < snapshotItems.length; idx += 1) {
      await applyHostItem(_ctx._KDB, snapshotItems[idx].itemId, _scopeId, [], _diagnostics, _ctx.filtersFacet);
      if (_support.isStale(_ctx.runtime, _payload)) { return; }
    }
    _support.pushUnique(_clearedScopes, _scopeId);
  }

  async function resyncHostScope(_KDB, _scopeId, _items, _diagnostics, _filtersFacet) {
    if (!_filtersFacet) {
      _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", scopeId: _scopeId, message: "host apply API unavailable" });
      return;
    }
    var ownerItems = _items || [];
    var idx;
    for (idx = 0; idx < ownerItems.length; idx += 1) {
      var item = ownerItems[idx];
      var filterRef = _lookupNativeMultiSelectRef(_KDB, item.itemId, _scopeId, _filtersFacet);
      if (!filterRef) {
        filterRef = _lookupNativeMultiSelectRefByName(_KDB, item.itemName, _scopeId, _filtersFacet);
      }
      if (!filterRef) {
        warnDestSkip({ itemId: item.itemId, itemName: item.itemName, scopeId: _scopeId });
        continue;
      }
      var itemId = String(filterRef.itemId || item.itemId || "");
      var outcome = await _filtersFacet.writeFilter({ ref: filterRef, values: item.values || [] });
      if (!outcome || outcome.ok !== true) {
        _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", itemId: itemId, scopeId: _scopeId, message: describeFailure(outcome) });
      }
    }
  }

  function failed(_operationId, _appliedScopes, _clearedScopes, _diagnostics) {
    return { ok: false, operationId: _operationId || null, appliedScopes: _appliedScopes || [], clearedScopes: _clearedScopes || [], diagnostics: _diagnostics || [] };
  }

  return {
    writeScopeFromSnapshot: writeScopeFromSnapshot,
    clearScopeItems: clearScopeItems,
    resyncHostScope: resyncHostScope,
    failed: failed
  };
});

define([
  "./state.js",
  "../_core/filterDefinitions.js",
  "../_core/ownerPolicy.js",
  "../../../core/utils/getKennzahlenSource.js"
], function (_state, _definitions, _ownerPolicy, _getKennzahlenSource) {
  "use strict";

  var stripTabpanel = _state.stripTabpanel;

  // Flat ref handed to the facet for reads and writes. scopeId carries the raw host string so a ref can be
  // fed straight back into a scoped lookup; the facet normalises it internally. sourceId is carried because
  // the history-replay path builds a fallback DTO out of the resolved ref.
  function buildRef(_descriptor) {
    if (!_descriptor) {
      return null;
    }
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      sourceId: _descriptor.sourceId,
      scopeId: _descriptor.rawScopeId,
      rawScopeId: _descriptor.rawScopeId
    };
  }

  // ---------- filter definitions (claim) ----------

  function claimOptions(_KDB) {
    return Object.assign({}, _definitions.NATIVE_DEFINITION_OPTIONS, { source: _getKennzahlenSource(_KDB) });
  }

  // Definitions of the active source grouped by scope type and item name, in the order of filterInstances.
  // Callers that classify many descriptors build it once per scan.
  function createClaimIndex(_KDB) {
    return _definitions.createDefinitionIndex(_KDB, claimOptions(_KDB));
  }

  function readClaimDefinition(_KDB, _scopeType, _itemName, _itemId, _index) {
    return _definitions.readDefinition(_KDB, _scopeType, _itemName, _itemId, _index, claimOptions(_KDB));
  }

  // ---------- ownership policy ----------

  // Ownership policy over a flat descriptor. This is KDB domain logic and stays with the owner: the cognosHost
  // filters facet only translates host items into descriptors, it does not decide which filter belongs to which owner.
  function isUnownedFilterDescriptor(_KDB, _descriptor, _claimIndex) {
    try {
      var descriptor = _descriptor || {};
      var itemId = String(descriptor.itemId || "").trim();
      if (!itemId) { return false; }
      var scope = String(descriptor.rawScopeId || "").trim();
      if (!scope) { return false; }
      var scopeType = stripTabpanel(scope) === "global" ? "global" : "pageContext";
      var itemName = String(descriptor.itemName || "");
      return _ownerPolicy.isClaimedByNativeMultiSelect(
        readClaimDefinition(_KDB, scopeType, itemName, itemId, _claimIndex),
        itemName
      );
    } catch (error) {
      console.error("[nativeMultiSelect.isUnownedFilterDescriptor] failed", error);
      return false;
    }
  }

  // ---------- inventory reads ----------

  // Projection back to the four-field DTO this module has always emitted. The facet descriptor carries more
  // (scopeType, scopeId, rawScopeId), but this DTO is serialised into tab-mutation snapshots, history slices
  // and writeback payloads, so extra keys would silently change stored payloads.
  function toOwnedItemDto(_descriptor) {
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      sourceId: _descriptor.sourceId,
      values: _descriptor.values || []
    };
  }

  // The facet already restricts the inventory to the requested scope; the ownership filter is the only
  // remaining decision. Fails closed on anything but a complete inventory: this DTO is persisted into writeback
  // payloads, tab-mutation snapshots and history slices, so a partial list must never pass for a complete one.
  function listUnownedItems(_KDB, _scopeId, _filtersFacet) {
    var outcome;
    var descriptors;
    var result;
    var index;
    var claimIndex;
    try {
      if (!_filtersFacet) { return []; }
      outcome = _filtersFacet.listFilterItems({ scopeId: _scopeId, includeValues: true });
      if (!outcome || outcome.outcome !== "ok") {
        if (outcome && outcome.diagnostics && outcome.diagnostics.length > 0) {
          console.error("[nativeMultiSelect.listUnownedItems] incomplete inventory", {
            scopeId: _scopeId, outcome: outcome.outcome, diagnostics: outcome.diagnostics
          });
        }
        return [];
      }
      descriptors = outcome.data || [];
      result = [];
      claimIndex = createClaimIndex(_KDB);
      for (index = 0; index < descriptors.length; index += 1) {
        if (!isUnownedFilterDescriptor(_KDB, descriptors[index], claimIndex)) { continue; }
        result.push(toOwnedItemDto(descriptors[index]));
      }
      return result;
    } catch (error) {
      console.error("[nativeMultiSelect.listUnownedItems] failed", error);
      return [];
    }
  }

  // Scope ids ("global" first, then every page scope that holds an unowned item) for a clear without tab targets.
  function listAllUnownedScopes(_KDB, _filtersFacet) {
    var result = ["global"];
    var seen = { global: true };
    var outcome;
    var descriptors;
    var claimIndex;
    var scopeId;
    var idx;
    if (!_filtersFacet) { return result; }
    outcome = _filtersFacet.listFilterItems({ allPageContextScopes: true });
    if (!outcome || outcome.ok !== true) { return result; }
    descriptors = outcome.data || [];
    claimIndex = createClaimIndex(_KDB);
    for (idx = 0; idx < descriptors.length; idx += 1) {
      if (!isUnownedFilterDescriptor(_KDB, descriptors[idx], claimIndex)) { continue; }
      scopeId = stripTabpanel(descriptors[idx].rawScopeId);
      if (!scopeId || seen[scopeId]) { continue; }
      seen[scopeId] = true;
      result.push(scopeId);
    }
    return result;
  }

  // Lookup by item id. nativeMultiSelect compares scopes normalised, which is exactly what the facet's ref
  // resolution does, so findFilterItem is a faithful replacement for a hand-rolled scan.
  function lookupRef(_KDB, _itemId, _scopeId, _filtersFacet) {
    var itemId = String(_itemId || "").trim();
    var outcome;
    try {
      if (!itemId || !_filtersFacet) { return null; }
      outcome = _filtersFacet.findFilterItem({ itemId: itemId, scopeId: _scopeId });
      if (!outcome || outcome.ok !== true || !outcome.data) { return null; }
      return buildRef(outcome.data);
    } catch (error) {
      console.error("[nativeMultiSelect.lookupRef] failed", error);
      return null;
    }
  }

  // Lookup by label. Unlike the id lookup this applies the ownership policy, so it scans descriptors itself
  // instead of using findFilterItem: deciding which filter belongs to nativeMultiSelect is owner logic.
  function lookupRefByName(_KDB, _itemName, _scopeId, _filtersFacet) {
    var nm = String(_itemName || "").trim();
    var targetScope;
    var outcome;
    var descriptors;
    var descriptor;
    var claimIndex;
    var idx;
    try {
      if (!nm || !_filtersFacet) { return null; }
      targetScope = stripTabpanel(_scopeId);
      outcome = _filtersFacet.listFilterItems({ scopeId: _scopeId });
      if (!outcome || outcome.ok !== true) { return null; }
      descriptors = outcome.data || [];
      claimIndex = createClaimIndex(_KDB);
      for (idx = 0; idx < descriptors.length; idx += 1) {
        descriptor = descriptors[idx];
        if (!isUnownedFilterDescriptor(_KDB, descriptor, claimIndex)) { continue; }
        if (String(descriptor.itemName || "").trim() !== nm) { continue; }
        if (targetScope !== "global" && stripTabpanel(descriptor.rawScopeId) !== targetScope) { continue; }
        return buildRef(descriptor);
      }
      return null;
    } catch (error) {
      console.error("[nativeMultiSelect.lookupRefByName] failed", error);
      return null;
    }
  }

  return {
    createClaimIndex: createClaimIndex,
    readClaimDefinition: readClaimDefinition,
    isUnownedFilterDescriptor: isUnownedFilterDescriptor,
    listUnownedItems: listUnownedItems,
    listAllUnownedScopes: listAllUnownedScopes,
    lookupRef: lookupRef,
    lookupRefByName: lookupRefByName
  };
});

define([
  "./isUnownedNativeMultiSelectItem.js"
], function (_isUnownedNativeMultiSelectItem) {
  "use strict";

  // Projection back to the four-field DTO this module has always emitted. The
  // facet descriptor carries more (scopeType, scopeId, rawScopeId), but this DTO
  // is serialised into tab-mutation snapshots, history slices and writeback
  // payloads, so extra keys would silently change stored payloads.
  function toOwnedItemDto(_descriptor) {
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      sourceId: _descriptor.sourceId,
      values: _descriptor.values || []
    };
  }

  // The facet already restricts the inventory to the requested scope, so the
  // per-item scope comparison this function used to do is gone; the ownership
  // filter below is the only remaining decision, and it stays with the owner.
  function listUnownedNativeMultiSelectItems(_KDB, _scopeId, _filtersFacet) {
    var outcome;
    var descriptors;
    var result;
    var index;
    try {
      if (!_filtersFacet) { return []; }
      outcome = _filtersFacet.listFilterItems({ scopeId: _scopeId, includeValues: true });
      // Fail closed on anything but a complete inventory, exactly as this
      // function did before the migration. This DTO is persisted into writeback
      // payloads, tab-mutation snapshots and history slices, so a partial list
      // must never pass for a complete one: a restore would silently drop a
      // filter. A degraded inventory carries diagnostics; log them rather than
      // let the degradation disappear.
      if (!outcome || outcome.outcome !== "ok") {
        if (outcome && outcome.diagnostics && outcome.diagnostics.length > 0) {
          console.error("[nativeMultiSelect.listUnownedNativeMultiSelectItems] incomplete inventory", {
            scopeId: _scopeId, outcome: outcome.outcome, diagnostics: outcome.diagnostics
          });
        }
        return [];
      }
      descriptors = outcome.data || [];
      result = [];
      for (index = 0; index < descriptors.length; index += 1) {
        if (!_isUnownedNativeMultiSelectItem.isUnownedFilterDescriptor(_KDB, descriptors[index])) { continue; }
        result.push(toOwnedItemDto(descriptors[index]));
      }
      return result;
    } catch (error) {
      console.error("[nativeMultiSelect.listUnownedNativeMultiSelectItems] failed", error);
      return [];
    }
  }

  return listUnownedNativeMultiSelectItems;
});

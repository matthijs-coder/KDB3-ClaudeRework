define([
  "./isUnownedNativeMultiSelectItem.js",
  "./stripTabpanel.js",
  "./buildNativeMultiSelectRef.js"
], function (_isUnownedNativeMultiSelectItem, _stripTabpanel, _buildRef) {
  "use strict";

  // Lookup by label. Unlike the id lookup this applies the ownership policy, so
  // it scans descriptors itself instead of using findFilterItem: deciding which
  // filter belongs to nativeMultiSelect is owner logic, not adapter logic.
  function lookupNativeMultiSelectRefByName(_KDB, _itemName, _scopeId, _filtersFacet) {
    var nm = String(_itemName || "").trim();
    var targetScope;
    var outcome;
    var descriptors;
    var descriptor;
    var idx;
    try {
      if (!nm || !_filtersFacet) { return null; }
      targetScope = _stripTabpanel(_scopeId);
      outcome = _filtersFacet.listFilterItems({ scopeId: _scopeId });
      if (!outcome || outcome.ok !== true) { return null; }
      descriptors = outcome.data || [];
      for (idx = 0; idx < descriptors.length; idx += 1) {
        descriptor = descriptors[idx];
        if (!_isUnownedNativeMultiSelectItem.isUnownedFilterDescriptor(_KDB, descriptor)) { continue; }
        if (String(descriptor.itemName || "").trim() !== nm) { continue; }
        if (targetScope !== "global" && _stripTabpanel(descriptor.rawScopeId) !== targetScope) { continue; }
        return _buildRef(descriptor);
      }
      return null;
    } catch (error) {
      console.error("[nativeMultiSelect.lookupNativeMultiSelectRefByName] failed", error);
      return null;
    }
  }

  return lookupNativeMultiSelectRefByName;
});

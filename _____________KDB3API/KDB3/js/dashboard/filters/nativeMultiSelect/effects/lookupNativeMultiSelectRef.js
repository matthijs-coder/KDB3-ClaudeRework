define([
  "./buildNativeMultiSelectRef.js"
], function (_buildRef) {
  "use strict";

  // Lookup by item id. nativeMultiSelect compares scopes normalised, which is
  // exactly what the facet's ref resolution does, so findFilterItem is a faithful
  // replacement for the old hand-rolled scan.
  function lookupNativeMultiSelectRef(_KDB, _itemId, _scopeId, _filtersFacet) {
    var itemId = String(_itemId || "").trim();
    var outcome;
    try {
      if (!itemId || !_filtersFacet) { return null; }
      outcome = _filtersFacet.findFilterItem({ itemId: itemId, scopeId: _scopeId });
      if (!outcome || outcome.ok !== true || !outcome.data) { return null; }
      return _buildRef(outcome.data);
    } catch (error) {
      console.error("[nativeMultiSelect.lookupNativeMultiSelectRef] failed", error);
      return null;
    }
  }

  return lookupNativeMultiSelectRef;
});

define([], function () {
  "use strict";

  // Returns a facet ref {itemId?, itemName?, scopeId} from the live instance
  // record. Host writes use this ref. The old live-handle cache is gone; it
  // used to be emptied before inventory and caused the M4 second race
  // (HOST_WRITE_FAILED in the reconcile gap).
  function resolveFilterRef(_KDB, _runtimeOrHandoff, _maybeHandoff) {
    try {
      var handoff = _maybeHandoff || _runtimeOrHandoff;
      var id = handoff ? handoff.filterInstanceId : null;
      var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
      var rec = root && root.instancesById && id ? root.instancesById[id] : null;
      var itemId;
      var itemName;
      var ref;
      if (!rec) {
        return null;
      }
      itemId = rec.itemId == null ? "" : String(rec.itemId).trim();
      itemName = rec.itemName == null ? "" : String(rec.itemName);
      if (!itemId && !itemName) {
        return null;
      }
      ref = { scopeId: rec.scopeId == null ? "" : String(rec.scopeId) };
      if (itemId) {
        ref.itemId = itemId;
      }
      if (itemName) {
        ref.itemName = itemName;
      }
      return ref;
    } catch (error) {
      console.error("[singleSelect.resolveFilterRef] failed", error);
      throw error;
    }
  }

  return {
    resolveFilterRef: resolveFilterRef
  };
});

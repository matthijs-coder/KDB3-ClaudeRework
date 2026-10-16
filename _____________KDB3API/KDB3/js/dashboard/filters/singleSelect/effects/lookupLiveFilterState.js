define([], function () {
  "use strict";

  // M4 reset-by-lookup (design doc section 3.6 point 2): completion code must
  // not write a captured instance that reconcile may already have replaced.
  // This is a pure map/delegated read — it must not go through ensureFilterState,
  // which mutates hostStatus and lastInteractionTs on every lookup.
  function __controller(_KDB, _handoff, _captured) {
    var root;
    var id;
    var rec;
    if (!_KDB || !_handoff) {
      return _captured;
    }
    root = _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!root) {
      return _captured;
    }
    id = _handoff.filterInstanceId;
    rec = root.instancesById && id ? root.instancesById[id] : null;
    if (_handoff.filterType === "sicht" || (rec && rec.selectionOwner === "sicht")) {
      return _handoff._delegatedWorkingState || _captured;
    }
    return rec || _captured;
  }

  return __controller;
});

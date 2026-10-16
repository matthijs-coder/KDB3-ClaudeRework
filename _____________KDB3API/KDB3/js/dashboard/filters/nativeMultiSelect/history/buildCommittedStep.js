define([], function () {
  "use strict";

  function cloneValues(_values) {
    var result = [];
    var idx;
    for (idx = 0; idx < (_values || []).length; idx += 1) {
      var pair = _values[idx] || {};
      result.push({
        d: pair.d != null ? String(pair.d) : "",
        u: pair.u != null ? String(pair.u) : ""
      });
    }
    return result;
  }

  function cloneSnapshot(_snapshot) {
    var snap = _snapshot || {};
    return {
      itemName: snap.itemName != null ? String(snap.itemName) : "",
      scopeKey: snap.scopeKey != null ? String(snap.scopeKey) : "",
      values: cloneValues(snap.values)
    };
  }

  function buildCommittedStep(_oldSnapshot, _newSnapshot, _timestamp) {
    return {
      key: "filter_nativeMultiSelect",
      timestamp: typeof _timestamp === "number" && isFinite(_timestamp) ? _timestamp : Date.now(),
      old: cloneSnapshot(_oldSnapshot),
      new: cloneSnapshot(_newSnapshot)
    };
  }

  return buildCommittedStep;
});

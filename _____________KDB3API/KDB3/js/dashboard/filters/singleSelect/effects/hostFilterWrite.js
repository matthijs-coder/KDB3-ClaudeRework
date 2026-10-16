define([
  "./readHostFilterValues.js"
], function (_readHostFilterValues) {
  "use strict";

  function isWriteReady(_filtersFacet) {
    return !!(_filtersFacet && typeof _filtersFacet.writeFilter === "function");
  }

  async function writeValues(_filtersFacet, _filterRef, _values) {
    var outcome;
    if (!isWriteReady(_filtersFacet) || !_filterRef) {
      return false;
    }
    outcome = await _filtersFacet.writeFilter({
      ref: _filterRef,
      values: Array.isArray(_values) ? _values : []
    });
    return !!(outcome && outcome.ok === true);
  }

  async function rollbackHostWrite(_filtersFacet, _filterRef, _priorValues) {
    var observed;
    var expected;
    var actual;
    try {
      if (!(await writeValues(_filtersFacet, _filterRef, _priorValues || []))) {
        return { ok: false };
      }
      observed = _readHostFilterValues(_filtersFacet, _filterRef);
      expected = JSON.stringify((_priorValues || []).slice());
      actual = JSON.stringify(Array.isArray(observed) ? observed : []);
      return { ok: expected === actual };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  return {
    isWriteReady: isWriteReady,
    writeValues: writeValues,
    readValues: _readHostFilterValues,
    rollbackHostWrite: rollbackHostWrite
  };
});

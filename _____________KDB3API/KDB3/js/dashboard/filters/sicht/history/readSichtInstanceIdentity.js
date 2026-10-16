define([
  "../../singleSelect/state/selectors.js"
], function (_singleSelectSelectors) {
  "use strict";

  // Enriches a history step value with the live singleSelect identity tuple.
  // Falls back to global/no-instance defaults so history building never fails.
  function readSichtInstanceIdentity(_KDB, _filterInstanceId) {
    try {
      var record = _filterInstanceId ? _singleSelectSelectors.readFilterInstance(_KDB, _filterInstanceId) : null;
      return {
        filterInstanceId: record ? record.filterInstanceId : (_filterInstanceId || null),
        scopeType: record ? record.scopeType : "global",
        scopeId: record ? record.scopeId : "global",
        itemId: record ? record.itemId : null,
        semanticInstanceKey: record ? record.semanticInstanceKey : null
      };
    } catch (error) {
      console.error("[sicht.readSichtInstanceIdentity] failed", { filterInstanceId: _filterInstanceId }, error);
      return {
        filterInstanceId: _filterInstanceId || null,
        scopeType: "global",
        scopeId: "global",
        itemId: null,
        semanticInstanceKey: null
      };
    }
  }

  return readSichtInstanceIdentity;
});

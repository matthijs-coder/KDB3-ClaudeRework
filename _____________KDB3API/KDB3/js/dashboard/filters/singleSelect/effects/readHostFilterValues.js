define([], function () {
  "use strict";

  function __controller(_filtersFacet, _filterRef) {
    var outcome;
    try {
      if (!_filtersFacet || !_filterRef || typeof _filtersFacet.readFilterValues !== "function") {
        return [];
      }
      outcome = _filtersFacet.readFilterValues(_filterRef);
      if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
        return [];
      }
      return outcome.data;
    } catch (error) {
      console.error("[singleSelect.readHostFilterValues] failed", error);
      throw error;
    }
  }

  return __controller;
});

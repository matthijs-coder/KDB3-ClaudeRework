define([], function () {
  "use strict";

  function readPartition(_filtersFacet, _input, _label) {
    var outcome = _filtersFacet.listFilterItems(_input);
    if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
      throw new Error("cognosAPI.filters inventory methods unavailable (" + _label + ")");
    }
    return {
      items: outcome.data,
      degraded: outcome.outcome === "degraded"
    };
  }

  function __controller(_filtersFacet) {
    var globalList;
    var pageList;
    if (!_filtersFacet || typeof _filtersFacet.listFilterItems !== "function") {
      throw new Error("cognosAPI.filters inventory methods unavailable");
    }
    globalList = readPartition(_filtersFacet, { scopeId: "global", includeValues: true }, "global");
    pageList = readPartition(
      _filtersFacet,
      { allPageContextScopes: true, includeValues: true },
      "pageContext"
    );
    return {
      descriptors: globalList.items.concat(pageList.items),
      uniquenessUnproven: globalList.degraded === true || pageList.degraded === true
    };
  }

  return __controller;
});

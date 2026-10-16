define([], function () {
  "use strict";

  function isTrueish(_value) {
    return _value === true || _value === "true" || _value === "trueish";
  }

  function __controller(_filterConfig, _KDB) {
    if (!_filterConfig || typeof _filterConfig !== "object") {
      return {
        isUpstream: false,
        isDownstream: false,
        isHierarchy: false,
        isSingleSelect: false,
        isNative: false,
        isSicht: false,
        hasAlleOption: false,
        condition: null
      };
    }
    var isUpstream = String(_filterConfig.cascade || "").trim().toLowerCase() === "upstream";
    var isSingleSelect = isTrueish(_filterConfig.isSingleSelect);
    return {
      isUpstream: isUpstream,
      isDownstream: String(_filterConfig.cascade || "").trim().toLowerCase() === "downstream",
      isHierarchy: isTrueish(_filterConfig.isHierarchy),
      isSingleSelect: isSingleSelect,
      isNative: isTrueish(_filterConfig.isNative),
      isSicht: isUpstream && isSingleSelect,
      hasAlleOption: isTrueish(_filterConfig.hasAlleOption),
      condition: _filterConfig.condition || null
    };
  }

  return __controller;
});

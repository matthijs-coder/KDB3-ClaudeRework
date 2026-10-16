define([], function () {
  "use strict";

  function isGlobalScope(_filterItem) {
    return _filterItem.getScope() === "global";
  }

  function __controller(_pageContextItems) {
    try {
      if (!Array.isArray(_pageContextItems) || _pageContextItems.length === 0) {
        return [];
      }
      return _pageContextItems.filter(isGlobalScope);
    } catch (error) {
      console.error("[cognosAPI.filters.listGlobalFilterItems] failed", error);
      throw error;
    }
  }

  return __controller;
});

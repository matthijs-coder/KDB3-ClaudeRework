define(["./resolvePlannerPageScopeId.js"], function (_resolvePlannerPageScopeId) {
  "use strict";

  function __controller(_KDB, _pageContextValuesByScope, _pageScopeId) {
    try {
      var map = _pageContextValuesByScope && typeof _pageContextValuesByScope === "object"
        ? _pageContextValuesByScope
        : {};
      var raw;
      var out;
      if (_pageScopeId == null || _pageScopeId === "") {
        return map;
      }
      raw = _resolvePlannerPageScopeId(_KDB, _pageScopeId);
      if (!raw || !Object.prototype.hasOwnProperty.call(map, raw)) {
        return {};
      }
      out = {};
      out[raw] = map[raw];
      return out;
    } catch (error) {
      console.error("[dienststelle.pickPageContextScopeMap] failed", error);
      throw error;
    }
  }

  return __controller;
});

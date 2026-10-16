define(["../state/copyDienststelleValueEntries.js"], function (_copyValues) {
  "use strict";

  function copyPageContextValues(_pageContext) {
    var out = {};
    var scopeIds;
    var idx;
    var scopeId;
    if (!_pageContext || typeof _pageContext !== "object") {
      return out;
    }
    scopeIds = Object.keys(_pageContext);
    for (idx = 0; idx < scopeIds.length; idx += 1) {
      scopeId = scopeIds[idx];
      out[scopeId] = _copyValues(_pageContext[scopeId]);
    }
    return out;
  }

  function valuesByScopeFromByFilter(_filterState) {
    var global = [];
    var pageContext = {};
    var scopes;
    var scopeIds;
    var idx;
    var scopeId;
    if (!_filterState || !_filterState.currentSelectionByScope) {
      return { global: global, pageContext: pageContext };
    }
    global = _copyValues(_filterState.currentSelectionByScope.global.currentValues);
    scopes = _filterState.currentSelectionByScope.pageContext || {};
    scopeIds = Object.keys(scopes);
    for (idx = 0; idx < scopeIds.length; idx += 1) {
      scopeId = scopeIds[idx];
      pageContext[scopeId] = _copyValues(scopes[scopeId].currentValues);
    }
    return { global: global, pageContext: pageContext };
  }

  function normalizeReplayTargetSnapshot(_target) {
    var filterState;
    if (!_target || typeof _target !== "object") {
      return null;
    }
    if (_target.valuesByScope) {
      return {
        activeSichtValue: _target.activeSichtValue,
        activeFilterKey: _target.activeFilterKey,
        visibleFilterLabel: _target.visibleFilterLabel,
        valuesByScope: {
          global: _copyValues(_target.valuesByScope.global),
          pageContext: copyPageContextValues(_target.valuesByScope.pageContext)
        }
      };
    }
    if (_target.byFilter && _target.activeFilterKey) {
      filterState = _target.byFilter[_target.activeFilterKey];
      return {
        activeSichtValue: _target.activeSichtValue,
        activeFilterKey: _target.activeFilterKey,
        visibleFilterLabel: _target.visibleFilterLabel,
        valuesByScope: valuesByScopeFromByFilter(filterState)
      };
    }
    return null;
  }

  function readDominantStoredSelection(_valuesByScope) {
    var globalValues;
    var pageContext;
    var scopeIds;
    if (!_valuesByScope) {
      return null;
    }
    globalValues = _valuesByScope.global;
    if (Array.isArray(globalValues) && globalValues.length) {
      return globalValues[0];
    }
    pageContext = _valuesByScope.pageContext || {};
    scopeIds = Object.keys(pageContext);
    if (scopeIds.length && Array.isArray(pageContext[scopeIds[0]]) && pageContext[scopeIds[0]].length) {
      return pageContext[scopeIds[0]][0];
    }
    return null;
  }

  return {
    normalizeReplayTargetSnapshot: normalizeReplayTargetSnapshot,
    readDominantStoredSelection: readDominantStoredSelection
  };
});

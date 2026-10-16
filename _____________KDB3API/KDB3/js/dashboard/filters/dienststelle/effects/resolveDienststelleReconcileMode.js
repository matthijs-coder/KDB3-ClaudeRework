define([
  "./readDienststelleHostSelection.js",
  "./reconcileDienststelleScopeDispatch.js"
], function (_hostSelection, _scopeDispatch) {
  "use strict";

  function hasMemberList(_value) {
    if (_value == null) {
      return false;
    }
    if (Array.isArray(_value)) {
      return _value.length > 0;
    }
    return true;
  }

  function resolveUserConfirmMode(_context, _hostGlobalValue, _effectiveGlobalValue, _pageValue) {
    var commitSourceScope = _scopeDispatch.resolveCommitSourceScope(_context);
    var allowDefaulting = _context.allowDefaulting === true && _context.isHistoryReplay !== true;
    if (!allowDefaulting) {
      return "sync";
    }
    if (commitSourceScope === "global" && (_scopeDispatch.isUserClearCommit(_context) || !hasMemberList(_hostGlobalValue))) {
      return "userCommit";
    }
    if (commitSourceScope === "pageContext" && !hasMemberList(_effectiveGlobalValue) && (_scopeDispatch.isUserClearCommit(_context) || !hasMemberList(_pageValue))) {
      return "userCommit";
    }
    return "sync";
  }

  function resolveWalkMode(_context, _globalValue) {
    if (_context.source === "tableData") {
      return "sync";
    }
    if (_context.isHistoryReplay === true) {
      return "sync";
    }
    if (hasMemberList(_globalValue)) {
      return "sync";
    }
    return "startup";
  }

  function readCommittedPageValue(_KDB, _definition, _context, _activeFilterKey, _filtersFacet) {
    var pageScopeId;
    var pageRef;
    if (_scopeDispatch.resolveCommitSourceScope(_context) !== "pageContext") {
      return null;
    }
    pageScopeId = _scopeDispatch.resolveClearedScopeId(_KDB, _definition, _context);
    pageRef = _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", pageScopeId);
    if (!pageRef) {
      return null;
    }
    return _hostSelection.readFilterValues(pageRef, _filtersFacet);
  }

  function readEffectiveGlobalValue(_KDB, _definition, _hostGlobalValue) {
    var filtersState;
    var filterState;
    var globalScope;
    var values;
    if (hasMemberList(_hostGlobalValue)) {
      return _hostGlobalValue;
    }
    filtersState = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
    filterState = filtersState && filtersState.byFilter ? filtersState.byFilter[_definition.activeFilterKey] : null;
    globalScope = filterState && filterState.currentSelectionByScope ? filterState.currentSelectionByScope.global : null;
    values = globalScope && globalScope.currentValues;
    if (Array.isArray(values) && values.length) {
      return values;
    }
    return null;
  }

  return {
    resolveUserConfirmMode: resolveUserConfirmMode,
    resolveWalkMode: resolveWalkMode,
    readCommittedPageValue: readCommittedPageValue,
    readEffectiveGlobalValue: readEffectiveGlobalValue
  };
});

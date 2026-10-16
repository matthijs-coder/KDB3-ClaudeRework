define([
  "../config/actions.js",
  "./readDienststelleHostSelection.js"
], function (_actions, _hostSelection) {
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

  function toDominantValues(_globalValue) {
    if (Array.isArray(_globalValue)) {
      return _globalValue.slice();
    }
    if (_globalValue) {
      return [_globalValue];
    }
    return [];
  }

  function finishReconcile(_dispatchInternal, _definition, _context, _label, _globalValue, _pageContextValuesByScope) {
    var resolution = {
      dominantScope: hasMemberList(_globalValue) ? "global" : null,
      dominantValues: toDominantValues(_globalValue),
      pageContextValuesByScope: _pageContextValuesByScope
    };
    _dispatchInternal({
      type: _actions.SYNC_REQUESTED,
      payload: {
        activeSichtValue: _definition.activeSichtValue,
        activeFilterKey: _definition.activeFilterKey,
        visibleFilterLabel: _label,
        activeHierarchyTableKey: _definition.hierarchyTableKey,
        activeDefaultTableKey: _definition.defaultTableKey,
        dominantScope: resolution.dominantScope,
        dominantValues: resolution.dominantValues,
        pageContextValuesByScope: resolution.pageContextValuesByScope,
        source: _context.source || "sync",
        isHistoryReplay: _context.isHistoryReplay === true
      }
    });
    return {
      activeSichtValue: _definition.activeSichtValue,
      activeFilterKey: _definition.activeFilterKey,
      visibleFilterLabel: _label,
      resolution: resolution,
      readinessFailed: false
    };
  }

  function resolveCommitSourceScope(_context) {
    var context = _context || {};
    return context.commitSourceScope || (context.filterScope === "pageContext" ? "pageContext" : "global");
  }

  function isUserClearCommit(_context) {
    var context = _context || {};
    return context.commitFromUser === true && context.commitSourceWasClear === true;
  }

  function dispatchScopeAction(_dispatchInternal, _definition, _label, _scopeId, _selection, _actionType) {
    _dispatchInternal({ type: _actionType, payload: { scopeId: _scopeId, filterKey: _definition.activeFilterKey, visibleFilterLabel: _label, selection: _selection } });
  }

  function dispatchScopeClear(_dispatchInternal, _definition, _label, _scopeId) {
    _dispatchInternal({ type: _actions.SELECTION_CLEARED, payload: { scopeId: _scopeId, filterKey: _definition.activeFilterKey, visibleFilterLabel: _label } });
  }

  function resolveClearedScopeId(_KDB, _definition, _context) {
    var context = _context || {};
    if (resolveCommitSourceScope(context) === "pageContext") {
      return _hostSelection.resolveRawPageContextScope(_KDB, _definition.activeFilterKey, context.scopeId) || context.scopeId;
    }
    return "global";
  }

  return {
    finishReconcile: finishReconcile,
    dispatchScopeAction: dispatchScopeAction,
    dispatchScopeClear: dispatchScopeClear,
    resolveCommitSourceScope: resolveCommitSourceScope,
    isUserClearCommit: isUserClearCommit,
    resolveClearedScopeId: resolveClearedScopeId
  };
});

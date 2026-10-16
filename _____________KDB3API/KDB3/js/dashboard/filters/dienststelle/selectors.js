define(["./state.js"], function (_state) {
  "use strict";

  function readStateRef(_KDB) {
    return _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
  }

  // Returns the stored object, not a copy: treat it as read-only.
  function readDienststelleState(_KDB) {
    return readStateRef(_KDB) || undefined;
  }

  function readActiveDienststelleContext(_KDB) {
    var state = readStateRef(_KDB);
    if (!state) {
      return null;
    }
    return {
      activeSichtValue: state.activeSichtValue,
      activeFilterKey: state.activeFilterKey,
      visibleFilterLabel: state.visibleFilterLabel,
      activeHierarchyTableKey: state.activeHierarchyTableKey,
      activeDefaultTableKey: state.activeDefaultTableKey
    };
  }

  function copySelectionValues(_values) {
    return _state.copyValueEntries(Array.isArray(_values) ? _values.filter(Boolean) : []);
  }

  function buildValuesByScope(_stateRef) {
    var filterKey = _stateRef.activeFilterKey;
    var filterState = _stateRef.byFilter && filterKey ? _stateRef.byFilter[filterKey] : null;
    var scopes;
    var pageContext = {};
    if (!filterState || !filterState.currentSelectionByScope) {
      return { global: [], pageContext: pageContext };
    }
    scopes = filterState.currentSelectionByScope.pageContext || {};
    Object.keys(scopes).forEach(function (scopeId) {
      pageContext[scopeId] = copySelectionValues(scopes[scopeId].currentValues);
    });
    return {
      global: copySelectionValues(filterState.currentSelectionByScope.global.currentValues),
      pageContext: pageContext
    };
  }

  function readDienststelleSnapshot(_KDB) {
    var state = readStateRef(_KDB);
    if (!state) {
      return null;
    }
    return {
      activeSichtValue: state.activeSichtValue,
      activeFilterKey: state.activeFilterKey,
      visibleFilterLabel: state.visibleFilterLabel,
      valuesByScope: buildValuesByScope(state)
    };
  }

  // The action types other modules dispatch to dienststelle (sicht -> dienststelle).
  var actionTypes = Object.freeze({
    SICHT_CHANGED: _state.ACTIONS.SICHT_CHANGED,
    HISTORY_REPLAY_REQUESTED: _state.ACTIONS.HISTORY_REPLAY_REQUESTED
  });

  return {
    actionTypes: actionTypes,
    readDienststelleState: readDienststelleState,
    readActiveDienststelleContext: readActiveDienststelleContext,
    readDienststelleSnapshot: readDienststelleSnapshot
  };
});

define([], function () {
  "use strict";

  function cloneObject(_value) {
    if (_value == null || typeof _value !== "object") {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_error) {
      return Object.assign({}, _value);
    }
  }

  function readDienststelleState(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
    return state ? cloneObject(state) : undefined;
  }

  function readActiveDienststelleContext(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
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

  function readDienststelleResolution(_KDB) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
    return state && state.resolution ? cloneObject(state.resolution) : null;
  }

  function readDienststelleFilterState(_KDB, _filterKey) {
    var state =
      _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
    var entry = state && state.byFilter ? state.byFilter[_filterKey] : null;
    return entry ? cloneObject(entry) : null;
  }

  function copiedHostDisplay(_entry) {
    if (!_entry || _entry.hostDisplay == null || String(_entry.hostDisplay) === "") {
      return "";
    }
    return String(_entry.hostDisplay);
  }

  function copySelectionValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (!entry) {
        continue;
      }
      out.push({
        displayValue: entry.displayValue != null ? String(entry.displayValue) : "",
        useValue: entry.useValue != null ? String(entry.useValue) : "",
        source: entry.source || "cognos",
        hostDisplay: copiedHostDisplay(entry)
      });
    }
    return out;
  }

  function buildValuesByScope(_state) {
    var filterKey = _state.activeFilterKey;
    var filterState = _state.byFilter && filterKey ? _state.byFilter[filterKey] : null;
    var global = [];
    var pageContext = {};
    var scopes;
    var scopeIds;
    var idx;
    var scopeId;
    if (!filterState || !filterState.currentSelectionByScope) {
      return { global: global, pageContext: pageContext };
    }
    global = copySelectionValues(filterState.currentSelectionByScope.global.currentValues);
    scopes = filterState.currentSelectionByScope.pageContext || {};
    scopeIds = Object.keys(scopes);
    for (idx = 0; idx < scopeIds.length; idx += 1) {
      scopeId = scopeIds[idx];
      pageContext[scopeId] = copySelectionValues(scopes[scopeId].currentValues);
    }
    return { global: global, pageContext: pageContext };
  }

  function readDienststelleSnapshot(_KDB) {
    var state = readDienststelleState(_KDB);
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

  return {
    readDienststelleState: readDienststelleState,
    readActiveDienststelleContext: readActiveDienststelleContext,
    readDienststelleResolution: readDienststelleResolution,
    readDienststelleSnapshot: readDienststelleSnapshot,
    readDienststelleFilterState: readDienststelleFilterState
  };
});

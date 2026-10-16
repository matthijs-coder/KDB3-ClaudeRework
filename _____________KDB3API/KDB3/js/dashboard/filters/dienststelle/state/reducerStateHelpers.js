define(["./copyDienststelleValueEntries.js", "./toScopeSelectionValues.js"], function (
  _copyValues,
  _toScopeSelectionValues
) {
  "use strict";

  function ensurePageScope(_filterState, _scopeId) {
    var pageContext = _filterState.currentSelectionByScope.pageContext;
    if (!pageContext[_scopeId]) {
      pageContext[_scopeId] = {
        scopeId: _scopeId,
        currentValues: [],
        backupValues: [],
        pendingValues: [],
        lastObservedHostValues: [],
        lastConfirmedAt: null
      };
    }
    return pageContext[_scopeId];
  }

  function ensureFilterState(_state, _filterKey, _visibleFilterLabel) {
    var byFilter = Object.assign({}, _state.byFilter);
    if (!byFilter[_filterKey]) {
      byFilter[_filterKey] = {
        filterKey: _filterKey,
        visibleFilterLabel: _visibleFilterLabel || "Dienststelle",
        status: "idle",
        isActive: false,
        currentSelectionByScope: {
          global: {
            scopeId: "global",
            currentValues: [],
            backupValues: [],
            pendingValues: [],
            lastObservedHostValues: [],
            lastConfirmedAt: null
          },
          pageContext: {}
        },
        resolution: null,
        lastInteraction: null,
        lastDefaultAt: null,
        lastConfirmedAt: null,
        errorCode: null,
        errorMessage: null
      };
    }
    return byFilter;
  }

  function applyScopeSelection(_filterState, _scopeId, _selection, _timestamp) {
    var values = _toScopeSelectionValues(_selection);
    var scopeEntry;
    if (_scopeId === "global") {
      scopeEntry = _filterState.currentSelectionByScope.global;
      scopeEntry.currentValues = values;
      scopeEntry.lastObservedHostValues = values;
      scopeEntry.lastConfirmedAt = _timestamp;
      return;
    }
    scopeEntry = ensurePageScope(_filterState, _scopeId);
    scopeEntry.currentValues = values;
    scopeEntry.lastObservedHostValues = values;
    scopeEntry.lastConfirmedAt = _timestamp;
  }

  function applyScopeClear(_filterState, _scopeId, _timestamp) {
    var scopeEntry;
    if (_scopeId === "global") {
      scopeEntry = _filterState.currentSelectionByScope.global;
    } else {
      scopeEntry = ensurePageScope(_filterState, _scopeId);
    }
    scopeEntry.currentValues = [];
    scopeEntry.pendingValues = [];
    scopeEntry.lastObservedHostValues = [];
    scopeEntry.lastConfirmedAt = _timestamp;
  }

  function applyTabMutationScopeWrite(_filterState, _scopeId, _entry, _clear, _timestamp) {
    var scopeEntry = ensurePageScope(_filterState, _scopeId);
    if (_clear) {
      scopeEntry.currentValues = [];
      scopeEntry.backupValues = [];
      scopeEntry.pendingValues = [];
      scopeEntry.lastObservedHostValues = [];
      scopeEntry.lastConfirmedAt = _timestamp;
      return;
    }
    var entry = _entry || {};
    scopeEntry.currentValues = _copyValues(entry.currentValues || []);
    scopeEntry.backupValues = _copyValues(entry.backupValues || []);
    scopeEntry.pendingValues = _copyValues(entry.pendingValues || []);
    scopeEntry.lastObservedHostValues = _copyValues(entry.lastObservedHostValues || []);
    scopeEntry.lastConfirmedAt = entry.lastConfirmedAt != null ? entry.lastConfirmedAt : _timestamp;
  }

  function clearFilterSelections(_filterState) {
    var global = _filterState.currentSelectionByScope.global;
    global.currentValues = [];
    global.backupValues = [];
    global.pendingValues = [];
    global.lastObservedHostValues = [];
    global.lastConfirmedAt = null;
    _filterState.currentSelectionByScope.pageContext = {};
  }

  function applyFilterStatusChange(_state, _payload) {
    var filterKey = _payload.filterKey || _state.activeFilterKey;
    var byFilter;
    var filterState;
    if (!filterKey) {
      return _state;
    }
    byFilter = ensureFilterState(_state, filterKey, _payload.visibleFilterLabel || _state.visibleFilterLabel);
    filterState = Object.assign({}, byFilter[filterKey]);
    filterState.status = _payload.status || filterState.status;
    if (_payload.status === "removed" || _payload.status === "inactive") {
      filterState.isActive = false;
      filterState.resolution = null;
      clearFilterSelections(filterState);
    } else if (_payload.status === "active" || _payload.isActive === true) {
      filterState.isActive = true;
    } else if (_payload.isActive === false) {
      filterState.isActive = false;
    }
    if (_payload.status === "error") {
      filterState.errorCode = _payload.errorCode || "DIENSTSTELLE_FILTER_ERROR";
      filterState.errorMessage = _payload.errorMessage != null ? String(_payload.errorMessage) : "";
    } else {
      filterState.errorCode = null;
      filterState.errorMessage = null;
    }
    byFilter[filterKey] = filterState;
    return Object.assign({}, _state, { byFilter: byFilter });
  }

  return {
    ensureFilterState: ensureFilterState,
    applyScopeSelection: applyScopeSelection,
    applyScopeClear: applyScopeClear,
    applyTabMutationScopeWrite: applyTabMutationScopeWrite,
    applyFilterStatusChange: applyFilterStatusChange
  };
});

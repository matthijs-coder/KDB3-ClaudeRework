define(["../../../core/utils/kit/data.js"], function (_data) {
  "use strict";

  var ACTIONS = {
    MOUNT_READY: "dienststelle/mountReady",
    FILTER_DOCK_STATE_CHANGED: "dienststelle/filterDockStateChanged",
    FILTER_DOCK_POPUP_READY: "dienststelle/filterDockPopupReady",
    FILTER_DOCK_FILTERS_READY: "dienststelle/filterDockFiltersReady",
    FILTER_DOCK_HEADER_OBSERVED: "dienststelle/filterDockHeaderObserved",
    FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED: "dienststelle/filterDockCommittedDisplayObserved",
    SICHT_CHANGED: "dienststelle/sichtChanged",
    SELECTION_OBSERVED: "dienststelle/selectionObserved",
    SELECTION_CLEARED: "dienststelle/selectionCleared",
    DEFAULT_APPLIED: "dienststelle/defaultApplied",
    HISTORY_REPLAY_REQUESTED: "dienststelle/historyReplayRequested",
    HISTORY_REPLAY_APPLIED: "dienststelle/historyReplayApplied",
    SYNC_REQUESTED: "dienststelle/syncRequested",
    TABLE_DATA_CHANGED: "dienststelle/tableDataChanged",
    PARAMETER_SET_CLEAR_REQUESTED: "dienststelle/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "dienststelle/parameterSetRestoreRequested",
    PREPARE_TAB_MUTATION: "dienststelle/prepareTabMutation",
    APPLY_TAB_MUTATION: "dienststelle/applyTabMutation",
    RESTORE_TAB_MUTATION_SNAPSHOT: "dienststelle/restoreTabMutationSnapshot",
    RESYNC_TAB_MUTATION_HOST: "dienststelle/resyncTabMutationHost",
    TAB_MUTATION_SCOPE_WRITE: "dienststelle/tabMutationScopeWrite",
    FILTER_STATUS_CHANGED: "dienststelle/filterStatusChanged",
    ERROR: "dienststelle/error",
    DESTROY: "dienststelle/destroy"
  };

  function createEmptyResolution() {
    return {
      activeFilterKey: null,
      visibleFilterLabel: "Dienststelle",
      dominantScope: null,
      dominantValues: [],
      downstreamValues: [],
      pageContextValuesByScope: {},
      resolvedAt: null
    };
  }

  function createInitialState() {
    return {
      lifecycle: "idle",
      activeSichtValue: null,
      activeFilterKey: null,
      visibleFilterLabel: "Dienststelle",
      activeHierarchyTableKey: null,
      activeDefaultTableKey: null,
      byFilter: {},
      resolution: createEmptyResolution(),
      defaults: {},
      replay: {
        isApplyingHistory: false,
        lastAppliedAt: null
      },
      meta: {
        lastFilterDockHandoffAt: null,
        lastSichtChangeAt: null,
        lastConfirmedAt: null
      },
      errorCode: null,
      errorMessage: null
    };
  }

  function copyValueEntry(_entry) {
    var entry = _entry || {};
    return {
      displayValue: entry.displayValue != null ? String(entry.displayValue) : "",
      useValue: entry.useValue != null ? String(entry.useValue) : "",
      source: entry.source || "cognos",
      hostDisplay: entry.hostDisplay != null && String(entry.hostDisplay) !== "" ? String(entry.hostDisplay) : ""
    };
  }

  function copyValueEntries(_values) {
    return Array.isArray(_values) ? _values.map(copyValueEntry) : [];
  }

  function toScopeSelectionValues(_selection) {
    if (!_selection) {
      return [];
    }
    return copyValueEntries(Array.isArray(_selection) ? _selection : [_selection]);
  }

  function createScopeEntry(_scopeId) {
    return {
      scopeId: _scopeId,
      currentValues: [],
      backupValues: [],
      pendingValues: [],
      lastObservedHostValues: [],
      lastConfirmedAt: null
    };
  }

  function createFilterState(_filterKey, _visibleFilterLabel) {
    return {
      filterKey: _filterKey,
      visibleFilterLabel: _visibleFilterLabel || "Dienststelle",
      status: "idle",
      isActive: false,
      currentSelectionByScope: { global: createScopeEntry("global"), pageContext: {} },
      resolution: null,
      lastInteraction: null,
      lastDefaultAt: null,
      lastConfirmedAt: null,
      errorCode: null,
      errorMessage: null
    };
  }

  // Copy-on-write: the previous state object is never mutated, so the `global` entry and `pageContext` map of
  // the returned filter state are new objects, and page entries are copied by writablePageScope before writing.
  function copyFilterState(_byFilter, _filterKey) {
    var filterState = Object.assign({}, _byFilter[_filterKey]);
    var scopes = filterState.currentSelectionByScope;
    filterState.currentSelectionByScope = {
      global: Object.assign({}, scopes.global),
      pageContext: Object.assign({}, scopes.pageContext)
    };
    return filterState;
  }

  function writablePageScope(_filterState, _scopeId) {
    var pageContext = _filterState.currentSelectionByScope.pageContext;
    pageContext[_scopeId] = pageContext[_scopeId] ? Object.assign({}, pageContext[_scopeId]) : createScopeEntry(_scopeId);
    return pageContext[_scopeId];
  }

  function writableScope(_filterState, _scopeId) {
    return _scopeId === "global" ? _filterState.currentSelectionByScope.global : writablePageScope(_filterState, _scopeId);
  }

  function ensureFilterState(_state, _filterKey, _visibleFilterLabel) {
    var byFilter = Object.assign({}, _state.byFilter);
    if (!byFilter[_filterKey]) {
      byFilter[_filterKey] = createFilterState(_filterKey, _visibleFilterLabel);
    }
    return byFilter;
  }

  function applyScopeSelection(_filterState, _scopeId, _selection, _timestamp) {
    var values = toScopeSelectionValues(_selection);
    var scopeEntry = writableScope(_filterState, _scopeId);
    scopeEntry.currentValues = values;
    scopeEntry.lastObservedHostValues = values;
    scopeEntry.lastConfirmedAt = _timestamp;
  }

  function applyScopeClear(_filterState, _scopeId, _timestamp) {
    var scopeEntry = writableScope(_filterState, _scopeId);
    scopeEntry.currentValues = [];
    scopeEntry.pendingValues = [];
    scopeEntry.lastObservedHostValues = [];
    scopeEntry.lastConfirmedAt = _timestamp;
  }

  function applyTabMutationScopeWrite(_filterState, _scopeId, _entry, _clear, _timestamp) {
    var scopeEntry = writablePageScope(_filterState, _scopeId);
    var entry = _entry || {};
    if (_clear) {
      scopeEntry.currentValues = [];
      scopeEntry.backupValues = [];
      scopeEntry.pendingValues = [];
      scopeEntry.lastObservedHostValues = [];
      scopeEntry.lastConfirmedAt = _timestamp;
      return;
    }
    scopeEntry.currentValues = copyValueEntries(entry.currentValues || []);
    scopeEntry.backupValues = copyValueEntries(entry.backupValues || []);
    scopeEntry.pendingValues = copyValueEntries(entry.pendingValues || []);
    scopeEntry.lastObservedHostValues = copyValueEntries(entry.lastObservedHostValues || []);
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

  function reduceFilterStatus(_state, _payload) {
    var filterKey = _payload.filterKey || _state.activeFilterKey;
    var byFilter;
    var filterState;
    if (!filterKey) {
      return _state;
    }
    byFilter = ensureFilterState(_state, filterKey, _payload.visibleFilterLabel || _state.visibleFilterLabel);
    filterState = copyFilterState(byFilter, filterKey);
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

  function reduceSelection(_state, _action, _payload) {
    var filterKey = _payload.filterKey || _state.activeFilterKey;
    var byFilter;
    var filterState;
    var timestamp;
    if (!filterKey) {
      return _state;
    }
    byFilter = ensureFilterState(_state, filterKey, _payload.visibleFilterLabel || _state.visibleFilterLabel);
    filterState = copyFilterState(byFilter, filterKey);
    timestamp = _payload.timestamp != null ? _payload.timestamp : Date.now();
    if (_action.type === ACTIONS.SELECTION_CLEARED) {
      applyScopeClear(filterState, _payload.scopeId || "global", timestamp);
    } else {
      applyScopeSelection(filterState, _payload.scopeId || "global", _payload.selection || {}, timestamp);
    }
    filterState.isActive = true;
    filterState.status = "active";
    filterState.errorCode = null;
    filterState.errorMessage = null;
    if (_action.type === ACTIONS.DEFAULT_APPLIED) {
      filterState.lastDefaultAt = timestamp;
    } else {
      filterState.lastConfirmedAt = timestamp;
    }
    byFilter[filterKey] = filterState;
    return Object.assign({}, _state, {
      byFilter: byFilter,
      meta: Object.assign({}, _state.meta, { lastConfirmedAt: timestamp }),
      errorCode: null,
      errorMessage: null
    });
  }

  function reduceTabMutationScopeWrite(_state, _payload) {
    var filterKey = _payload.filterKey;
    var byFilter;
    var filterState;
    if (!filterKey || !_payload.scopeId || _payload.scopeId === "global") {
      return _state;
    }
    byFilter = ensureFilterState(_state, filterKey, _payload.visibleFilterLabel || _state.visibleFilterLabel);
    filterState = copyFilterState(byFilter, filterKey);
    applyTabMutationScopeWrite(
      filterState,
      _payload.scopeId,
      _payload.entry,
      _payload.clear === true,
      _payload.timestamp != null ? _payload.timestamp : Date.now()
    );
    byFilter[filterKey] = filterState;
    return Object.assign({}, _state, { byFilter: byFilter, errorCode: null, errorMessage: null });
  }

  function reduceActiveDefinition(_state, _payload) {
    return {
      activeSichtValue: _payload.activeSichtValue || _state.activeSichtValue,
      activeFilterKey: _payload.activeFilterKey || _state.activeFilterKey,
      visibleFilterLabel: _payload.visibleFilterLabel || _state.visibleFilterLabel,
      activeHierarchyTableKey: _payload.activeHierarchyTableKey || _state.activeHierarchyTableKey,
      activeDefaultTableKey: _payload.activeDefaultTableKey || _state.activeDefaultTableKey
    };
  }

  function reduceSichtChanged(_state, _payload) {
    return Object.assign({}, _state, reduceActiveDefinition(_state, _payload), {
      meta: Object.assign({}, _state.meta, {
        lastSichtChangeAt: _payload.observedAt != null ? _payload.observedAt : Date.now()
      }),
      errorCode: null,
      errorMessage: null
    });
  }

  function reduceSyncRequested(_state, _payload) {
    return Object.assign({}, _state, reduceActiveDefinition(_state, _payload), {
      resolution: Object.assign({}, _state.resolution, {
        activeFilterKey: _payload.activeFilterKey || _state.resolution.activeFilterKey,
        visibleFilterLabel: _payload.visibleFilterLabel || _state.resolution.visibleFilterLabel,
        dominantScope: _payload.dominantScope,
        dominantValues: copyValueEntries(_payload.dominantValues || []),
        pageContextValuesByScope: _data.cloneJson(_payload.pageContextValuesByScope || {}),
        resolvedAt: Date.now()
      }),
      replay: Object.assign({}, _state.replay, {
        isApplyingHistory: _payload.isHistoryReplay === true
      })
    });
  }

  function reduceDienststelle(_state, _action) {
    var state = _state || createInitialState();
    var action = _action || {};
    var payload = action.payload || {};
    switch (action.type) {
      case ACTIONS.MOUNT_READY:
        return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
      case ACTIONS.FILTER_DOCK_STATE_CHANGED:
      case ACTIONS.FILTER_DOCK_POPUP_READY:
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            lastFilterDockHandoffAt: payload.timestamp != null ? payload.timestamp : state.meta.lastFilterDockHandoffAt
          })
        });
      case ACTIONS.SICHT_CHANGED:
        return reduceSichtChanged(state, payload);
      case ACTIONS.FILTER_STATUS_CHANGED:
        return reduceFilterStatus(state, payload);
      case ACTIONS.SELECTION_OBSERVED:
      case ACTIONS.DEFAULT_APPLIED:
      case ACTIONS.SELECTION_CLEARED:
        return reduceSelection(state, action, payload);
      case ACTIONS.TAB_MUTATION_SCOPE_WRITE:
        return reduceTabMutationScopeWrite(state, payload);
      case ACTIONS.SYNC_REQUESTED:
        return reduceSyncRequested(state, payload);
      case ACTIONS.HISTORY_REPLAY_APPLIED:
        return Object.assign({}, state, {
          replay: Object.assign({}, state.replay, {
            isApplyingHistory: false,
            lastAppliedAt: payload.appliedAt != null ? payload.appliedAt : Date.now()
          }),
          errorCode: null,
          errorMessage: null
        });
      case ACTIONS.ERROR:
        return Object.assign({}, state, {
          lifecycle: "error",
          errorCode: payload.errorCode || "DIENSTSTELLE_ERROR",
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : ""
        });
      case ACTIONS.DESTROY:
        return Object.assign({}, state, {
          lifecycle: "disposed",
          replay: Object.assign({}, state.replay, { isApplyingHistory: false })
        });
      default:
        return state;
    }
  }

  return {
    ACTIONS: ACTIONS,
    createInitialState: createInitialState,
    reduceDienststelle: reduceDienststelle,
    copyValueEntries: copyValueEntries
  };
});

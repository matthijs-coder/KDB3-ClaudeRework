define([
  "../config/actions.js",
  "./initialState.js",
  "./reducerStateHelpers.js",
  "./cloneJsonValue.js",
  "./copyDienststelleValueEntries.js"
], function (_actions, _initialState, _helpers, _clone, _copyValues) {
  "use strict";

  function createDienststelleReducer() {
    return function reducer(_state, _action) {
      var state = _state || _initialState();
      var action = _action || {};
      var payload = action.payload || {};
      var filterKey;
      var byFilter;
      var filterState;
      var selection;
      var timestamp;

      if (action.type === _actions.MOUNT_READY) {
        return Object.assign({}, state, {
          lifecycle: "ready",
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.FILTER_DOCK_STATE_CHANGED || action.type === _actions.FILTER_DOCK_POPUP_READY) {
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            lastFilterDockHandoffAt:
              payload.timestamp != null ? payload.timestamp : state.meta.lastFilterDockHandoffAt
          })
        });
      }
      if (action.type === _actions.SICHT_CHANGED) {
        return Object.assign({}, state, {
          activeSichtValue: payload.activeSichtValue || state.activeSichtValue,
          activeFilterKey: payload.activeFilterKey || state.activeFilterKey,
          visibleFilterLabel: payload.visibleFilterLabel || state.visibleFilterLabel,
          activeHierarchyTableKey:
            payload.activeHierarchyTableKey || state.activeHierarchyTableKey,
          activeDefaultTableKey: payload.activeDefaultTableKey || state.activeDefaultTableKey,
          meta: Object.assign({}, state.meta, {
            lastSichtChangeAt: payload.observedAt != null ? payload.observedAt : Date.now()
          }),
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.FILTER_STATUS_CHANGED) {
        return _helpers.applyFilterStatusChange(state, payload);
      }
      if (
        action.type === _actions.SELECTION_OBSERVED ||
        action.type === _actions.DEFAULT_APPLIED ||
        action.type === _actions.SELECTION_CLEARED
      ) {
        filterKey = payload.filterKey || state.activeFilterKey;
        if (!filterKey) {
          return state;
        }
        byFilter = _helpers.ensureFilterState(state, filterKey, payload.visibleFilterLabel || state.visibleFilterLabel);
        filterState = Object.assign({}, byFilter[filterKey]);
        timestamp = payload.timestamp != null ? payload.timestamp : Date.now();
        if (action.type === _actions.SELECTION_CLEARED) {
          _helpers.applyScopeClear(filterState, payload.scopeId || "global", timestamp);
        } else {
          selection = payload.selection || {};
          _helpers.applyScopeSelection(filterState, payload.scopeId || "global", selection, timestamp);
        }
        filterState.isActive = true;
        filterState.status = "active";
        filterState.errorCode = null;
        filterState.errorMessage = null;
        if (action.type === _actions.DEFAULT_APPLIED) {
          filterState.lastDefaultAt = timestamp;
        } else {
          filterState.lastConfirmedAt = timestamp;
        }
        byFilter[filterKey] = filterState;
        return Object.assign({}, state, {
          byFilter: byFilter,
          meta: Object.assign({}, state.meta, { lastConfirmedAt: timestamp }),
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.TAB_MUTATION_SCOPE_WRITE) {
        filterKey = payload.filterKey;
        if (!filterKey || !payload.scopeId || payload.scopeId === "global") { return state; }
        byFilter = _helpers.ensureFilterState(state, filterKey, payload.visibleFilterLabel || state.visibleFilterLabel);
        filterState = Object.assign({}, byFilter[filterKey]);
        _helpers.applyTabMutationScopeWrite(filterState, payload.scopeId, payload.entry, payload.clear === true, payload.timestamp != null ? payload.timestamp : Date.now());
        byFilter[filterKey] = filterState;
        return Object.assign({}, state, { byFilter: byFilter, errorCode: null, errorMessage: null });
      }
      if (action.type === _actions.SYNC_REQUESTED) {
        return Object.assign({}, state, {
          activeSichtValue: payload.activeSichtValue || state.activeSichtValue,
          activeFilterKey: payload.activeFilterKey || state.activeFilterKey,
          visibleFilterLabel: payload.visibleFilterLabel || state.visibleFilterLabel,
          activeHierarchyTableKey:
            payload.activeHierarchyTableKey || state.activeHierarchyTableKey,
          activeDefaultTableKey: payload.activeDefaultTableKey || state.activeDefaultTableKey,
          resolution: Object.assign({}, state.resolution, {
            activeFilterKey: payload.activeFilterKey || state.resolution.activeFilterKey,
            visibleFilterLabel: payload.visibleFilterLabel || state.resolution.visibleFilterLabel,
            dominantScope: payload.dominantScope,
            dominantValues: _copyValues(payload.dominantValues || []),
            pageContextValuesByScope: _clone(payload.pageContextValuesByScope || {}),
            resolvedAt: Date.now()
          }),
          replay: Object.assign({}, state.replay, {
            isApplyingHistory: payload.isHistoryReplay === true
          })
        });
      }
      if (action.type === _actions.HISTORY_REPLAY_APPLIED) {
        return Object.assign({}, state, {
          replay: Object.assign({}, state.replay, {
            isApplyingHistory: false,
            lastAppliedAt: payload.appliedAt != null ? payload.appliedAt : Date.now()
          }),
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.ERROR) {
        return Object.assign({}, state, {
          lifecycle: "error",
          errorCode: payload.errorCode || "DIENSTSTELLE_ERROR",
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : ""
        });
      }
      if (action.type === _actions.DESTROY) {
        return Object.assign({}, state, {
          lifecycle: "disposed",
          replay: Object.assign({}, state.replay, { isApplyingHistory: false })
        });
      }
      return state;
    };
  }

  return createDienststelleReducer;
});
